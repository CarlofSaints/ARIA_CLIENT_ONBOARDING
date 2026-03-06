import { NextResponse, after } from "next/server";
import { getClients, saveClients, getCams } from "@/lib/dataStore";
import { getOJToken, graph, graphJson, pollTeamsOp } from "@/lib/graphOJ";

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
  const [clients, cams] = await Promise.all([getClients(), getCams()]);
  const client = clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Client not found");

  const cam = cams.find((c) => c.id === client.camId);
  const ownerEmails = [...new Set([...FIXED_OWNERS, ...(cam?.email ? [cam.email] : [])])];

  const token = await getOJToken();
  const ownerMembers = await buildOwnerMembers(token, ownerEmails);

  // --- 1. Create Team ---
  const createRes = await graph(token, "/teams", {
    method: "POST",
    body: JSON.stringify({
      "template@odata.bind": "https://graph.microsoft.com/v1.0/teamsTemplates('standard')",
      displayName: client.name,
      description: `ARIA Client Team — ${client.name}`,
      members: ownerMembers,
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
  const extChannel = extRes.ok ? await extRes.json() : null;
  const extChannelId = extChannel?.id as string | undefined;

  // --- 5. Create INTERNAL channel (private) ---
  const intRes = await graph(token, `/teams/${teamId}/channels`, {
    method: "POST",
    body: JSON.stringify({
      displayName: `${client.name} - INTERNAL`,
      membershipType: "private",
      description: "Internal operations channel",
      members: ownerMembers,
    }),
  });
  const intChannel = intRes.ok ? await intRes.json() : null;
  const intChannelId = intChannel?.id as string | undefined;

  // --- 6. Planner: create plan + buckets + tab on EXTERNAL ---
  if (extChannelId) {
    try {
      // Small delay to allow team's group to settle
      await new Promise((r) => setTimeout(r, 3000));

      const planRes = await graph(token, "/planner/plans", {
        method: "POST",
        body: JSON.stringify({
          container: {
            url: `https://graph.microsoft.com/v1.0/groups/${teamId}`,
            type: "group",
          },
          title: `${client.name} — Onboarding`,
        }),
      });

      if (planRes.ok) {
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
        await graph(token, `/teams/${teamId}/channels/${extChannelId}/tabs`, {
          method: "POST",
          body: JSON.stringify({
            displayName: "Planner",
            "teamsApp@odata.bind":
              "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps('com.microsoft.teamspace.tab.planner')",
            configuration: {
              entityId: planId,
              contentUrl: `https://tasks.office.com/${TENANT_ID}/Home/PlannerFrame?page=7&planId=${planId}`,
              websiteUrl: `https://tasks.office.com/${TENANT_ID}/Home/PlanViews/${planId}`,
              removeUrl: `https://tasks.office.com/${TENANT_ID}/Home/PlannerFrame?page=13&planId=${planId}`,
            },
          }),
        });
      }
    } catch (e) {
      console.warn("Planner setup failed (non-fatal):", e);
    }
  }

  // --- 7. SharePoint Lists: create list + columns + tab on INTERNAL ---
  if (intChannelId) {
    try {
      const teamSiteRes = await graph(token, `/groups/${teamId}/sites/root`);
      if (teamSiteRes.ok) {
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

        if (listRes.ok) {
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
            await graph(token, `/sites/${teamSiteId}/lists/${listId}/columns`, {
              method: "POST",
              body: JSON.stringify(col),
            });
          }

          // Pin Lists tab to INTERNAL channel
          await graph(token, `/teams/${teamId}/channels/${intChannelId}/tabs`, {
            method: "POST",
            body: JSON.stringify({
              displayName: listName,
              "teamsApp@odata.bind":
                "https://graph.microsoft.com/v1.0/appCatalogs/teamsApps('2a527703-1f6f-4559-a332-d8a7d288cd88')",
              configuration: {
                entityId: listId,
                contentUrl: `${teamSiteUrl}/_layouts/15/teamslogon.aspx?SPFX=true&dest=${teamSiteUrl}/_layouts/15/SPListApp.aspx?listId=${listId}&source=teamtab`,
                websiteUrl: `${teamSiteUrl}/Lists/${encodeURIComponent(listName)}`,
                removeUrl: null,
              },
            }),
          });
        }
      }
    } catch (e) {
      console.warn("Lists setup failed (non-fatal):", e);
    }
  }

  // --- 8. Persist team ID and status ---
  const freshClients = await getClients();
  const freshIdx = freshClients.findIndex((c) => c.id === clientId);
  if (freshIdx !== -1) {
    freshClients[freshIdx].teamsStatus = "created";
    freshClients[freshIdx].teamsId = teamId;
    await saveClients(freshClients);
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  // Set to creating and return immediately
  clients[idx].teamsStatus = "creating";
  await saveClients(clients);

  after(async () => {
    try {
      await createTeamsStructure(id);
    } catch (err) {
      console.error("Teams creation error:", err);
      const freshClients = await getClients();
      const freshIdx = freshClients.findIndex((c) => c.id === id);
      if (freshIdx !== -1) {
        freshClients[freshIdx].teamsStatus = "error";
        await saveClients(freshClients);
      }
    }
  });

  return NextResponse.json({ status: "creating" }, { status: 202 });
}
