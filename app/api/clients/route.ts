import { NextResponse, after } from "next/server";
import { getClients, saveClients, getCams, getChannels, Client } from "@/lib/dataStore";
import { randomUUID } from "crypto";
import { sendWelcomeEmail, sendCamNewClientEmail } from "@/lib/email";
import { addLog } from "@/lib/activityLog";

const COGNITO_FORM_URL = "https://www.cognitoforms.com/outerjoin1/clientbillinginformationoj";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aria-onboarding-two.vercel.app";

export async function GET() {
  return NextResponse.json(await getClients());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, logoBase64, website, camId, emails, startDate, channelIds, contactName, userId, userName } = body as {
    name: string;
    logoBase64?: string;
    website?: string;
    camId: string;
    emails: string[];
    startDate: string;
    channelIds: string[];
    contactName: string;
    userId?: string;
    userName?: string;
  };

  if (!name || !camId || !emails?.length || !startDate || !channelIds?.length || !contactName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const personnelToken = randomUUID();

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
    personnelToken,
    checklist: {
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

  await addLog({
    action: "client.created",
    clientId: newClient.id,
    clientName: newClient.name,
    userId,
    userName,
    details: `Client "${newClient.name}" created. Contact: ${newClient.contactName}.`,
    success: true,
  });

  await addLog({
    action: "checklist.toggle",
    clientId: newClient.id,
    clientName: newClient.name,
    userName: "system",
    details: `"Welcome email sent" auto-checked on client creation.`,
    success: true,
  });

  const [cams, allChannels] = await Promise.all([getCams(), getChannels()]);
  const cam = cams.find((c) => c.id === camId);
  const camFullName = cam ? `${cam.name} ${cam.surname}` : "your Account Manager";
  const camEmail = cam?.email ?? "";
  const personnelFormUrl = `${SITE_URL}/personnel/${personnelToken}`;
  const channelNames = channelIds
    .map((id) => allChannels.find((ch) => ch.id === id)?.name)
    .filter(Boolean) as string[];

  after(async () => {
    // Welcome email to client
    try {
      await sendWelcomeEmail({
        clientName: newClient.name,
        camName: camFullName,
        camEmail,
        contactName: newClient.contactName,
        logoBase64: newClient.logoBase64,
        recipients: newClient.emails,
        personnelFormUrl,
        cognitoFormUrl: COGNITO_FORM_URL,
      });
      await addLog({
        action: "email.welcome",
        clientId: newClient.id,
        clientName: newClient.name,
        userId,
        userName,
        details: `Welcome email sent to ${newClient.emails.join(", ")}.`,
        success: true,
      });
    } catch (err) {
      const errMsg = (err as Error).message ?? "Unknown error";
      console.error("Welcome email error:", err);
      await addLog({
        action: "email.welcome",
        clientId: newClient.id,
        clientName: newClient.name,
        userId,
        userName,
        details: `Failed to send welcome email to ${newClient.emails.join(", ")}.`,
        success: false,
        error: errMsg,
      });
      // Un-check the auto item if email fails
      const clients2 = await getClients();
      const idx = clients2.findIndex((c) => c.id === newClient.id);
      if (idx !== -1) {
        clients2[idx].checklist["cl-welcome-email"] = { completed: false };
        await saveClients(clients2);
      }
    }

    // CAM notification email
    if (camEmail) {
      try {
        await sendCamNewClientEmail({
          camName: camFullName,
          camEmail,
          clientName: newClient.name,
          channels: channelNames,
          portalUrl: SITE_URL,
        });
        await addLog({
          action: "email.cam-notification",
          clientId: newClient.id,
          clientName: newClient.name,
          userId,
          userName,
          details: `CAM notification sent to ${camEmail}.`,
          success: true,
        });
      } catch (err) {
        const errMsg = (err as Error).message ?? "Unknown error";
        console.error("CAM notification email error:", err);
        await addLog({
          action: "email.cam-notification",
          clientId: newClient.id,
          clientName: newClient.name,
          userId,
          userName,
          details: `Failed to send CAM notification to ${camEmail}.`,
          success: false,
          error: errMsg,
        });
      }
    }
  });

  return NextResponse.json(newClient, { status: 201 });
}
