import { NextResponse } from "next/server";
import { getClients, saveClients } from "@/lib/dataStore";
import { getOJToken, graph, graphJson, pollSPCopy, SP_HOST } from "@/lib/graphOJ";
import { addLog } from "@/lib/activityLog";

const TEMPLATE_PATH = "_ClientFolderTemplate/ARIA";

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
  if (client.sharepointStatus === "created") {
    return NextResponse.json({ error: "SharePoint folder already created for this client" }, { status: 409 });
  }

  try {
    const token = await getOJToken();

    // 1. Get root SP site
    const site = await graphJson<{ id: string }>(token, `/sites/${SP_HOST}`);
    const siteId = site.id;

    // 2. Find the Clients document library
    const drivesData = await graphJson<{ value: Array<{ id: string; name: string }> }>(
      token, `/sites/${siteId}/drives`
    );
    const clientsDrive = drivesData.value.find((d) => d.name === "Clients");
    if (!clientsDrive) throw new Error("'Clients' document library not found on SharePoint site");
    const driveId = clientsDrive.id;

    // 3. Create the client's root folder (uppercase)
    const clientFolderName = client.name.toUpperCase();
    const folderRes = await graph(token, `/drives/${driveId}/root/children`, {
      method: "POST",
      body: JSON.stringify({
        name: clientFolderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    });

    let clientFolderId: string;
    if (folderRes.status === 409) {
      // Already exists — get it
      const existing = await graphJson<{ id: string }>(
        token, `/drives/${driveId}/root:/${encodeURIComponent(clientFolderName)}`
      );
      clientFolderId = existing.id;
    } else if (folderRes.ok) {
      const created = await folderRes.json();
      clientFolderId = created.id;
    } else {
      const t = await folderRes.text();
      throw new Error(`Failed to create client folder: ${folderRes.status} ${t}`);
    }

    // 4. Get the ARIA template folder
    const template = await graphJson<{ id: string }>(
      token, `/drives/${driveId}/root:/${TEMPLATE_PATH}`
    );

    // 5. Copy template into the client folder (async operation)
    const copyRes = await graph(token, `/drives/${driveId}/items/${template.id}/copy`, {
      method: "POST",
      body: JSON.stringify({
        parentReference: { driveId, id: clientFolderId },
        name: "ARIA",
      }),
    });

    if (!copyRes.ok) {
      const t = await copyRes.text();
      throw new Error(`Copy failed: ${copyRes.status} ${t}`);
    }

    // 6. Poll monitor URL for completion
    const monitorUrl = copyRes.headers.get("Location");
    if (monitorUrl) await pollSPCopy(monitorUrl);

    // 7. Persist status
    const freshClients = await getClients();
    const freshIdx = freshClients.findIndex((c) => c.id === id);
    if (freshIdx !== -1) {
      freshClients[freshIdx].sharepointStatus = "created";
      await saveClients(freshClients);
    }

    await addLog({
      action: "sharepoint.created",
      clientId: client.id,
      clientName: client.name,
      userId: body.userId,
      userName: body.userName,
      details: `SharePoint folder structure created at ${clientFolderName}/ARIA.`,
      success: true,
    });
    return NextResponse.json({ ok: true, folder: `${clientFolderName}/ARIA` });
  } catch (err) {
    console.error("SharePoint folder creation error:", err);
    const errMsg = (err as Error).message ?? String(err);
    await addLog({
      action: "sharepoint.created",
      clientId: client.id,
      clientName: client.name,
      userId: body.userId,
      userName: body.userName,
      details: "SharePoint folder creation failed.",
      success: false,
      error: errMsg.slice(0, 300),
    });
    const freshClients = await getClients();
    const freshIdx = freshClients.findIndex((c) => c.id === id);
    if (freshIdx !== -1) {
      freshClients[freshIdx].sharepointStatus = "error";
      await saveClients(freshClients);
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
