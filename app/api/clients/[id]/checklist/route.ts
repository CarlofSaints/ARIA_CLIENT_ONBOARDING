import { NextResponse } from "next/server";
import { getClients, saveClients, ChecklistItemState } from "@/lib/dataStore";

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
  const { itemId, state } = body as { itemId: string; state: ChecklistItemState };

  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  clients[idx].checklist = { ...(clients[idx].checklist ?? {}), [itemId]: state };
  await saveClients(clients);
  return NextResponse.json(clients[idx].checklist);
}
