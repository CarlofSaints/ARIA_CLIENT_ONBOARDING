import { NextResponse } from "next/server";
import { getClients, saveClients } from "@/lib/dataStore";
import { addLog } from "@/lib/activityLog";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  clients[idx] = { ...clients[idx], ...body };
  await saveClients(clients);
  return NextResponse.json(clients[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clients = await getClients();
  const target = clients.find((c) => c.id === id);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await saveClients(clients.filter((c) => c.id !== id));
  await addLog({ action: "client.deleted", clientId: id, clientName: target.name, details: "Client permanently deleted.", success: true });
  return NextResponse.json({ ok: true });
}
