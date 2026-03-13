import { NextResponse } from "next/server";
import { after } from "next/server";
import { getClients, getChannels, getLogs, saveLogs } from "@/lib/dataStore";
import { sendMandateEmail } from "@/lib/email";
import { randomUUID } from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json() as { channelId: string; userId?: string; userName?: string };
  const { channelId, userId, userName } = body;

  const [clients, channels] = await Promise.all([getClients(), getChannels()]);

  const client = clients.find((c) => c.id === id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const channel = channels.find((ch) => ch.id === channelId);
  if (!channel) return NextResponse.json({ error: "Channel not found" }, { status: 404 });

  if (!channel.mandateBase64 || !channel.mandateEmailSubject || !channel.mandateFileName) {
    return NextResponse.json({ error: "Mandate not configured for this channel" }, { status: 400 });
  }

  if (!client.emails || client.emails.length === 0) {
    return NextResponse.json({ error: "Client has no email addresses" }, { status: 400 });
  }

  after(async () => {
    let success = true;
    let errorMsg: string | undefined;
    try {
      await sendMandateEmail({
        clientName: client.name,
        contactName: client.contactName,
        recipients: client.emails,
        subject: channel.mandateEmailSubject!,
        body: channel.mandateEmailBody ?? "",
        mandateFileName: channel.mandateFileName!,
        mandateBase64: channel.mandateBase64!,
      });
    } catch (e) {
      success = false;
      errorMsg = e instanceof Error ? e.message : String(e);
    }

    const logs = await getLogs();
    logs.unshift({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      action: "email.mandate",
      clientId: client.id,
      clientName: client.name,
      userId,
      userName,
      details: `Mandate email sent for channel: ${channel.name}`,
      success,
      error: errorMsg,
    });
    await saveLogs(logs.slice(0, 500));
  });

  return NextResponse.json({ ok: true });
}
