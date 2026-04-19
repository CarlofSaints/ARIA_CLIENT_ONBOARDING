import { NextResponse } from "next/server";
import { after } from "next/server";
import { getClients, saveClients, getNdaTemplate, getLogs, saveLogs } from "@/lib/dataStore";
import { sendNdaEmail } from "@/lib/email";
import { randomUUID } from "crypto";

function formatAddress(addr: Record<string, string>): string {
  return [addr.Line1, addr.Line2, addr.City, addr.Region ?? addr.State, addr.PostalCode]
    .filter(Boolean)
    .join(", ");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { userId?: string; userName?: string };
  const { userId, userName } = body;

  const [clients, template] = await Promise.all([getClients(), getNdaTemplate()]);

  const client = clients.find((c) => c.id === id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!client.cognitoData) return NextResponse.json({ error: "No Cognito data linked — link Cognito entry first" }, { status: 400 });
  if (!template) return NextResponse.json({ error: "No NDA template uploaded — upload one in Admin → Legal Templates" }, { status: 400 });
  if (!client.emails || client.emails.length === 0) return NextResponse.json({ error: "Client has no email addresses" }, { status: 400 });

  const cognito = client.cognitoData as Record<string, unknown>;
  const s = (k: string) => (typeof cognito[k] === "string" ? (cognito[k] as string).trim() : "");
  const addr = (cognito["Address"] && typeof cognito["Address"] === "object")
    ? cognito["Address"] as Record<string, string>
    : {} as Record<string, string>;

  const variables = {
    clientName: s("CompanyName") || s("TradingAs") || client.name,
    regNumber: s("CompanyRegistrationNumber"),
    address: formatAddress(addr),
  };

  // Fill placeholders using direct XML manipulation
  // (docxtemplater fails when {{ and }} are split across separate XML runs, which Word often does)
  let filledBuffer: Buffer;
  try {
    const PizZip = (await import("pizzip")).default;
    const zip = new PizZip(Buffer.from(template.base64, "base64"));
    const escXml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    let xmlContent = zip.file("word/document.xml")?.asText() ?? "";
    xmlContent = xmlContent
      .replace(/<w:t(?:[^>]*)>CLIENT NAME<\/w:t>/g, `<w:t>${escXml(variables.clientName)}</w:t>`)
      .replace(/<w:t(?:[^>]*)>Client Company Registration Number<\/w:t>/g, `<w:t>${escXml(variables.regNumber)}</w:t>`)
      .replace(/<w:t(?:[^>]*)>Client Address<\/w:t>/g, `<w:t>${escXml(variables.address)}</w:t>`)
      .replace(/<w:t(?:[^>]*)>\{\{<\/w:t>/g, "<w:t></w:t>")
      .replace(/<w:t(?:[^>]*)>\}\}<\/w:t>/g, "<w:t></w:t>");
    zip.file("word/document.xml", xmlContent);
    filledBuffer = Buffer.from(zip.generate({ type: "nodebuffer" }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Template error: ${msg}` }, { status: 500 });
  }

  // Update client: ndaSentAt
  const idx = clients.findIndex((c) => c.id === id);
  const now = new Date().toISOString();
  clients[idx] = { ...clients[idx], ndaSentAt: now };

  // Auto-check cl-nda-sent
  const checklist = { ...(clients[idx].checklist ?? {}) };
  checklist["cl-nda-sent"] = { completed: true, completedAt: now, completedBy: "system" };
  clients[idx] = { ...clients[idx], checklist };

  await saveClients(clients);

  after(async () => {
    let success = true;
    let errorMsg: string | undefined;
    try {
      const cam = userName ?? "Your Account Manager";
      await sendNdaEmail({
        clientName: client.name,
        contactName: client.contactName,
        camName: cam,
        recipients: client.emails,
        ndaBuffer: filledBuffer,
        ndaFileName: `NDA - ${client.name}.docx`,
      });
    } catch (e) {
      success = false;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    const logs = await getLogs();
    logs.unshift({
      id: randomUUID(),
      timestamp: now,
      action: "email.nda",
      clientId: client.id,
      clientName: client.name,
      userId,
      userName,
      details: `NDA sent to ${client.emails.join(", ")}`,
      success,
      error: errorMsg,
    });
    await saveLogs(logs.slice(0, 500));
  });

  return NextResponse.json({ ok: true });
}
