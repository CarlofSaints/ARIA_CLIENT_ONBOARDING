import { NextResponse } from "next/server";
import { after } from "next/server";
import { getClients, saveClients, getCams, getLogs, saveLogs } from "@/lib/dataStore";
import { sendControlFileSignOffEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as {
    recipients: string[];
    cc?: string[];
    customSubject?: string;
    customBody?: string;
    userId?: string;
    userName?: string;
  };
  const { recipients, cc, customSubject, customBody, userId, userName } = body;

  if (!recipients || recipients.length === 0) {
    return NextResponse.json({ error: "No recipients provided" }, { status: 400 });
  }

  const [clients, cams] = await Promise.all([getClients(), getCams()]);
  const client = clients.find((c) => c.id === id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const cam = cams.find((c) => c.id === client.camId);
  const camName = cam ? `${cam.name} ${cam.surname}` : (userName ?? "Your Account Manager");
  const camEmail = cam?.email ?? "onboarding@outerjoin.co.za";

  // Mark signOffEmailSentAt
  const idx = clients.findIndex((c) => c.id === id);
  const now = new Date().toISOString();
  clients[idx] = { ...clients[idx], signOffEmailSentAt: now };
  await saveClients(clients);

  after(async () => {
    let success = true;
    let errorMsg: string | undefined;
    try {
      await sendControlFileSignOffEmail({
        camName,
        camEmail,
        recipients,
        cc,
        clientName: client.name,
        customBody,
        customSubject,
      });
    } catch (e) {
      success = false;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    const logs = await getLogs();
    logs.unshift({
      id: randomUUID(),
      timestamp: now,
      action: "email.signoff",
      clientId: client.id,
      clientName: client.name,
      userId,
      userName,
      details: `Control file sign-off email sent to ${recipients.join(", ")}`,
      success,
      error: errorMsg,
    });
    await saveLogs(logs.slice(0, 500));
  });

  return NextResponse.json({ ok: true });
}
