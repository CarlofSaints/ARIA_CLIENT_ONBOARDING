import { NextResponse } from "next/server";
import { getClients, saveClients, getChecklistItems, ChecklistItemState } from "@/lib/dataStore";
import { addLog } from "@/lib/activityLog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clients = await getClients();
  const client = clients.find((c) => c.id === id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client.checklist ?? {});
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { itemId, state, userId, userName, itemLabel } = body as {
    itemId: string;
    state: ChecklistItemState;
    userId?: string;
    userName?: string;
    itemLabel?: string;
  };

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = clients[idx];
  clients[idx].checklist = { ...(clients[idx].checklist ?? {}), [itemId]: state };
  await saveClients(clients);

  const label = itemLabel ?? itemId;
  const action = state.completed ? "checked" : "unchecked";
  await addLog({
    action: "checklist.toggle",
    clientId: client.id,
    clientName: client.name,
    userId,
    userName,
    details: `"${label}" ${action}${state.channelStates ? " (per-channel update)" : ""}.`,
    success: true,
  });

  return NextResponse.json(clients[idx].checklist);
}
