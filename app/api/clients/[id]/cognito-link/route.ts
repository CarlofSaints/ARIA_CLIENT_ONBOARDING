import { NextResponse } from "next/server";
import { getClients, saveClients, getLogs, saveLogs } from "@/lib/dataStore";
import { randomUUID } from "crypto";

const COGNITO_BASE = "https://www.cognitoforms.com/api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as {
    entryId: string;
    userId?: string;
    userName?: string;
  };
  const { entryId, userId, userName } = body;

  const apiKey = process.env.COGNITO_API_KEY?.replace(/\s/g, "");
  const formId = process.env.COGNITO_FORM_ID ?? "4";

  if (!apiKey) {
    return NextResponse.json({ error: "COGNITO_API_KEY is not configured" }, { status: 500 });
  }

  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Fetch the full entry from Cognito
  const res = await fetch(`${COGNITO_BASE}/forms/${formId}/entries/${entryId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return NextResponse.json(
      { error: err.Message ?? `Cognito error ${res.status}` },
      { status: res.status }
    );
  }

  const entryData: Record<string, unknown> = await res.json();

  clients[idx] = {
    ...clients[idx],
    cognitoEntryId: String(entryId),
    cognitoData: entryData,
    cognitoLinkedAt: new Date().toISOString(),
  };
  await saveClients(clients);

  // Log
  const logs = await getLogs();
  logs.unshift({
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    action: "cognito.linked",
    clientId: clients[idx].id,
    clientName: clients[idx].name,
    userId,
    userName,
    details: `Linked Cognito entry #${entryId}`,
    success: true,
  });
  await saveLogs(logs.slice(0, 500));

  return NextResponse.json({ ok: true, cognitoData: entryData });
}

// DELETE — unlink
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  clients[idx] = {
    ...clients[idx],
    cognitoEntryId: undefined,
    cognitoData: undefined,
    cognitoLinkedAt: undefined,
  };
  await saveClients(clients);
  return NextResponse.json({ ok: true });
}
