import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getClients, saveClients } from "@/lib/dataStore";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = clients[idx];

  // Generate token if one doesn't exist yet
  let token = client.personnelToken;
  if (!token) {
    token = randomUUID();
    clients[idx].personnelToken = token;
    await saveClients(clients);
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host") ?? "";
  const siteUrl = `${proto}://${host}`;
  const formUrl = `${siteUrl}/personnel/${token}`;

  return NextResponse.json({ token, url: formUrl });
}
