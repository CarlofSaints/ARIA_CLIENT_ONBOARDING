import { NextResponse, after } from "next/server";
import { getClients, saveClients, getCams } from "@/lib/dataStore";
import { getOJToken, graph, graphJson, pollTeamsOp } from "@/lib/graphOJ";
import { addLog } from "@/lib/activityLog";

const FIXED_OWNERS = ["carl@outerjoin.co.za", "mark@outerjoin.co.za"];
const TENANT_ID = process.env.OJ_TENANT_ID!;

async function getUserId(token: string, email: string): Promise<string | null> {
  try {
    const data = await graphJson<{ id: string }>(token, `/users/${encodeURIComponent(email)}`);
    return data.id;
  } catch {
    console.warn(`Could not find user ID for ${email}`);
    return null;
  }
}

async function buildOwnerMembers(token: string, emails: string[]) {
  const ids = await Promise.all(emails.map((e) => getUserId(token, e)));
  return ids
    .filter((id): id is string => id !== null)
    .map((userId) => ({
      "@odata.type": "#microsoft.graph.aadUserConversationMember",
      roles: ["owner"],
      "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userId}')`,
    }));
}

async function createTeamsStructure(clientId: string) {
  const warnings: string[] = [];
  const [clients, cams] = await Promise.all([getClients(), getCams()]);
  const client = clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Client not found");

  const cam = cams.find((c) => c.id === client.camId);
  const ownerEmails = [...new Set([...FIXED_OWNERS, ...(cam?.email ? [cam.email] : [])])];

  const token = await getOJToken();
  const ownerMembers = await buildOwnerMembers(token, ownerEmails);

  if (ownerMembers.length === 0) {
    throw new Error(
      `No owner accounts could be resolved. Checked: ${ownerEmails.join(", ")}. ` +
      `Ensure the Azure app has User.Read.All (application permission) and the accounts exist in the tenant.`
    );
  }

  // --- 1. Create Team ---
  // App-only tokens only support one member at creation time; add remaining owners after provisioning
  const createRes = await graph(token, "/teams", {
    method: "POST",
    body: JSON.stringify({
      "template@odata.bind": "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
      displayName: client.name,
      description: `ARIA Client Team — ${client.name}`,
      members: [ownerMembers[0]],
    }),
  });

  if (createRes.status !== 202) {
    const t = await createRes.text();
    throw new Error(`Team creation failed: ${createRes.status} ${t}`);
  }

  const monitorUrl = createRes.headers.get("Location");
  if (!monitorUrl) throw new Error("No monitor URL returned from Teams create");

  // --- 2. Poll for provisioning ---
  const teamId = await pollTeamsOp(monitorUrl, token);

  // --- 2b. Add remaining owners ---
  for (const member of ownerMembers.slice(1)) {
    try {
      await graph(token, `/teams/${teamId}/members`, {
        method: "POST",
        body: JSON.stringify(member),
      });
    } catch (e) {
      console.warn("Could not add additional owner (non-fatal):", e);
    }
  }

  // --- 3. Set team photo ---
  if (client.logoBase64) {
    try {
      const match = client.logoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const buffer = Buffer.from(match[2], "base64");
        await fetch(`https://graph.microsoft.com/v1.0/teams/${teamId}/photo/$value`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": mimeType },
          body: buffer,
        });
      }
    } catch (e) {
      console.warn("Team photo failed (non-fatal):", e);
    }
  }

  // --- 4. Create EXTERNAL channel (standard) ---
  const extRes = await graph(token, `/teams/${teamId}/channels`, {
    method: "POST",
    body: JSON.stringify({
      displayName: `${client.name} - EXTERNAL`,
      membershipType: "standard",
      description: "Client-facing shared channel",
    }),
  });
  const extText = await extRes.text();
  let extChannelId: string | undefined;
  try { if (extRes.ok) extChannelId = JSON.parse(extText)?.id; } catch {}
  if (!extChannelId) {
    warnings.push(`EXTERNAL channel creation failed: ${extRes.status} ${extText}`.slice(0, 250));
  }

  // --- 5. Create INTERNAL channel (standard) ---
  // Standard channels do not support members at creation time — all team members have access automatically
  const intRes = await graph(token, `/teams/${teamId}/channels`, {
    method: "POST",
    body: JSON.stringify({
      displayName: `${client.name} - PRIVATE`,
      membershipType: "standard",
      description: "Internal operations channel (set to private manually after creation)",
    }),
  });
  const intText = await intRes.text();
  let intChannelId: string | undefined;
  try { if (intRes.ok) intChannelId = JSON.parse(intText)?.id; } catch {}
  if (!intChannelId) {
    warnings.push(`INTERNAL channel creation failed: ${intRes.status} ${intText}`.slice(0, 250));
  }

  // --- 6. Planner: create plan + buckets + tab on EXTERNAL ---
  if (extChannelId) {
    try {
      // Wait for team's group to fully settle before Planner operations
      await new Promise((r) => setTimeout(r, 8000));

      const planRes = await graph(token, "/planner/plans", {
        method: "POST",
        body: JSON.stringify({
          container: {
            type: "group",
            containerId: teamId,
          },
          title: `${client.name} — Onboarding`,
        }),
      });

      if (!planRes.ok) {
        const t = await planRes.text().catch(() => "");
        warnings.push(`Planner plan creation failed: ${planRes.status} ${t}`.slice(0, 200));
      } else {
        const plan = await planRes.json();
        const planId = plan.id as string;

        const buckets = [
          "Control Files",
          "Meeting Minutes and Recordings",
          "Ad Hoc Reports",
          "AUTO & SCHEDULED REPORTS",
        ];
        for (const name of buckets) {
          await graph(token, "/planner/buckets", {
            method: "POST",
            body: JSON.stringify({ name, planId, orderHint: " !" }),
          });
        }

        // Pin Planner tab to EXTERNAL channel
        const tabRes = await graph(token, `/teams/${teamId}/channels/${extChannelId}/tabs`, {
          method: "POST",
          body: JSON.stringify({
            displayName: "Planner",
            "teamsApp@odata.bind":
              "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps('com.microsoft.teamspace.tab.planner')",
            configuration: {
              entityId: planId,
              contentUrl: `https://tasks.office.com/${TENANT_ID}/Home/PlannerFrame?page=7&planId=${planId}&mkt=en-US`,
              websiteUrl: `https://tasks.office.com/${TENANT_ID}/Home/PlanViews/${planId}`,
              removeUrl: `https://tasks.office.com/${TENANT_ID}/Home/PlannerFrame?page=13&planId=${planId}&mkt=en-US`,
            },
          }),
        });
        if (!tabRes.ok) {
          const t = await tabRes.text().catch(() => "");
          warnings.push(`Planner tab pin failed: ${tabRes.status} ${t}`.slice(0, 200));
        }
      }
    } catch (e) {
      warnings.push(`Planner setup error: ${(e as Error).message}`.slice(0, 200));
    }
  }

  // --- 7. SharePoint Lists: create list + columns + tab on INTERNAL ---
  // Use the team's main SP site (always ready after provisioning; private channel members have access)
  if (intChannelId) {
    try {
      const teamSiteRes = await graph(token, `/groups/${teamId}/sites/root`);
      if (!teamSiteRes.ok) {
        const t = await teamSiteRes.text().catch(() => "");
        warnings.push(`Team site fetch failed: ${teamSiteRes.status} ${t}`.slice(0, 200));
      } else {
        const teamSite = await teamSiteRes.json();
        const teamSiteId = teamSite.id as string;
        const teamSiteUrl = teamSite.webUrl as string;
        const listName = `Action List - ${client.name} Internal`;

        const listRes = await graph(token, `/sites/${teamSiteId}/lists`, {
          method: "POST",
          body: JSON.stringify({
            displayName: listName,
            list: { template: "genericList" },
          }),
        });

        if (!listRes.ok) {
          const t = await listRes.text().catch(() => "");
          warnings.push(`Action list creation failed: ${listRes.status} ${t}`.slice(0, 200));
        } else {
          const list = await listRes.json();
          const listId = list.id as string;

          const columns = [
            { name: "Action Item Name", text: {} },
            { name: "Person Responsible", text: {} },
            { name: "Date Loaded", dateTime: { format: "dateOnly" } },
            { name: "Due Date", dateTime: { format: "dateOnly" } },
            { name: "Full Description", text: { allowMultipleLines: true } },
            { name: "Has this been completed?", boolean: {} },
            { name: "Created by Person", personOrGroup: {} },
            { name: "Modified by Person", personOrGroup: {} },
          ];

          for (const col of columns) {
            const colRes = await graph(token, `/sites/${teamSiteId}/lists/${listId}/columns`, {
              method: "POST",
              body: JSON.stringify(col),
            });
            if (!colRes.ok) {
              const t = await colRes.text().catch(() => "");
              warnings.push(`Column "${col.name}" failed: ${colRes.status} ${t}`.slice(0, 150));
            }
          }

          // Pin Lists tab to INTERNAL channel using the channel's own SP site URL
          const listTabRes = await graph(token, `/teams/${teamId}/channels/${intChannelId}/tabs`, {
            method: "POST",
            body: JSON.stringify({
              displayName: "Action List",
              "teamsApp@odata.bind":
                "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps('2a527703-1f6f-4559-a332-d8a7d288cd88')",
              configuration: {
                entityId: `{${listId}}`,
                contentUrl: `${teamSiteUrl}/_layouts/15/SPListApp.aspx?listId={${listId}}&source=teamtab`,
                websiteUrl: `${teamSiteUrl}/Lists/${encodeURIComponent(listName)}`,
                removeUrl: "",
              },
            }),
          });
          if (!listTabRes.ok) {
            const t = await listTabRes.text().catch(() => "");
            warnings.push(`Action List tab pin failed: ${listTabRes.status} ${t}`.slice(0, 200));
          }
        }
      }
    } catch (e) {
      warnings.push(`Lists setup error: ${(e as Error).message}`.slice(0, 200));
    }
  }

  // --- 8. Persist team ID, status, and any non-fatal warnings ---
  const freshClients = await getClients();
  const freshIdx = freshClients.findIndex((c) => c.id === clientId);
  if (freshIdx !== -1) {
    freshClients[freshIdx].teamsStatus = "created";
    freshClients[freshIdx].teamsId = teamId;
    freshClients[freshIdx].teamsError = undefined;
    freshClients[freshIdx].teamsWarnings = warnings.length > 0 ? warnings : undefined;
    await saveClients(freshClients);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { userId?: string; userName?: string };
  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = clients[idx];

  if (client.teamsStatus === "created") {
    return NextResponse.json({ error: "Teams structure already created for this client" }, { status: 409 });
  }
  if (client.teamsStatus === "creating") {
    return NextResponse.json({ status: "creating" });
  }

  // Set to creating and return immediately; clear any previous error
  clients[idx].teamsStatus = "creating";
  clients[idx].teamsError = undefined;
  await saveClients(clients);

  after(async () => {
    try {
      await createTeamsStructure(id);
      await addLog({
        action: "teams.created",
        clientId: client.id,
        clientName: client.name,
        userId: body.userId,
        userName: body.userName,
        details: "Teams structure (team, channels, Planner, Action List) created successfully.",
        success: true,
      });
    } catch (err) {
      console.error("Teams creation error:", err);
      const errMsg = (err as Error).message?.slice(0, 300) ?? "Unknown error";
      await addLog({
        action: "teams.created",
        clientId: client.id,
        clientName: client.name,
        userId: body.userId,
        userName: body.userName,
        details: "Teams structure creation failed.",
        success: false,
        error: errMsg,
      });
      const freshClients = await getClients();
      const freshIdx = freshClients.findIndex((c) => c.id === id);
      if (freshIdx !== -1) {
        freshClients[freshIdx].teamsStatus = "error";
        freshClients[freshIdx].teamsError = errMsg;
        await saveClients(freshClients);
      }
    }
  });

  return NextResponse.json({ status: "creating" }, { status: 202 });
}
