import { NextResponse } from "next/server";
import { after } from "next/server";
import { getClients, saveClients, getLogs, saveLogs, type DocTemplateKind } from "@/lib/dataStore";
import { sendDocumentEmail } from "@/lib/email";
import { documentLabel } from "@/lib/docTemplate";
import { randomUUID } from "crypto";

export const maxDuration = 60;

const VALID_KINDS: DocTemplateKind[] = ["nda", "sla", "eula"];

type Body = {
  kind?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  fileName?: string;
  attachmentBase64?: string;
  userId?: string;
  userName?: string;
};

const clean = (arr?: string[]): string[] =>
  Array.from(new Set((arr ?? []).map((s) => s.trim()).filter(Boolean)));

// POST — email an already-generated (reviewed) document with editable
// recipients/subject/body. The browser passes back the exact attachment the
// admin reviewed, so what's sent is what they saw.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const b = (await request.json()) as Body;

  if (!b.kind || !(VALID_KINDS as string[]).includes(b.kind)) {
    return NextResponse.json({ error: "Invalid or missing document kind" }, { status: 400 });
  }
  const docKind = b.kind as DocTemplateKind;
  const label = documentLabel(docKind);

  const to = clean(b.to);
  const cc = clean(b.cc);
  const bcc = clean(b.bcc);
  if (to.length === 0) return NextResponse.json({ error: "At least one TO recipient is required" }, { status: 400 });
  if (!b.subject?.trim()) return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  if (!b.attachmentBase64) return NextResponse.json({ error: "No document attached — generate it first" }, { status: 400 });
  const fileName = b.fileName?.trim() || `${label}.docx`;

  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  const client = clients[idx];

  try {
    await sendDocumentEmail({
      to,
      cc,
      bcc,
      subject: b.subject.trim(),
      bodyText: b.body ?? "",
      attachments: [{ filename: fileName, base64: b.attachmentBase64 }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send email";
    after(async () => {
      const logs = await getLogs();
      logs.unshift({
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        action: `email.${docKind}`,
        clientId: client.id,
        clientName: client.name,
        userId: b.userId,
        userName: b.userName,
        details: `${label} send failed`,
        success: false,
        error: msg,
      });
      await saveLogs(logs.slice(0, 500));
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Persist the sent timestamp on the client.
  const now = new Date().toISOString();
  const sentField = docKind === "sla" ? "slaSentAt" : docKind === "eula" ? "eulaSentAt" : "ndaSentAt";
  clients[idx] = { ...clients[idx], [sentField]: now };
  await saveClients(clients);

  after(async () => {
    const logs = await getLogs();
    logs.unshift({
      id: randomUUID(),
      timestamp: now,
      action: `email.${docKind}`,
      clientId: client.id,
      clientName: client.name,
      userId: b.userId,
      userName: b.userName,
      details: `${label} sent to ${to.join(", ")}${cc.length ? ` (cc: ${cc.join(", ")})` : ""}`,
      success: true,
    });
    await saveLogs(logs.slice(0, 500));
  });

  return NextResponse.json({ ok: true, sentAt: now });
}
