import { NextResponse } from "next/server";
import { getClients, saveClients, getCams, Client } from "@/lib/dataStore";
import { randomUUID } from "crypto";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET() {
  return NextResponse.json(await getClients());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, logoBase64, website, camId, emails, startDate, channelIds, contactName } = body as {
    name: string;
    logoBase64?: string;
    website?: string;
    camId: string;
    emails: string[];
    startDate: string;
    channelIds: string[];
    contactName: string;
  };

  if (!name || !camId || !emails?.length || !startDate || !channelIds?.length || !contactName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const newClient: Client = {
    id: `client-${randomUUID()}`,
    name: name.trim(),
    logoBase64,
    website: website?.trim(),
    camId,
    emails,
    startDate,
    channelIds,
    contactName: contactName.trim(),
    status: "intake",
    checklist: {
      // Welcome email auto-checked on creation (we send it below)
      "cl-welcome-email": {
        completed: true,
        completedAt: now,
        completedBy: "system",
      },
    },
    createdAt: now,
  };

  const clients = await getClients();
  clients.push(newClient);
  await saveClients(clients);

  const cams = await getCams();
  const cam = cams.find((c) => c.id === camId);
  const camFullName = cam ? `${cam.name} ${cam.surname}` : "your Account Manager";

  sendWelcomeEmail({
    clientName: newClient.name,
    camName: camFullName,
    contactName: newClient.contactName,
    logoBase64: newClient.logoBase64,
    recipients: newClient.emails,
  }).catch(async (err) => {
    console.error("Welcome email error:", err);
    // Un-check the auto item if email fails
    const clients2 = await getClients();
    const idx = clients2.findIndex((c) => c.id === newClient.id);
    if (idx !== -1) {
      clients2[idx].checklist["cl-welcome-email"] = { completed: false };
      await saveClients(clients2);
    }
  });

  return NextResponse.json(newClient, { status: 201 });
}
