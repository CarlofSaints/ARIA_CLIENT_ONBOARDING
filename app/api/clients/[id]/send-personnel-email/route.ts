import { NextResponse } from "next/server";
import { getClients, getCams } from "@/lib/dataStore";
import { sendPersonnelInviteEmail } from "@/lib/email";
import { addLog } from "@/lib/activityLog";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { customBody, customSubject } = body as {
    customBody?: string;
    customSubject?: string;
  };

  const clients = await getClients();
  const client = clients.find((c) => c.id === id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!client.personnelToken) {
    return NextResponse.json(
      { error: "No form link generated yet — generate the form link first" },
      { status: 400 }
    );
  }

  const recipients = client.emails ?? [];
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No email addresses on record for this client" },
      { status: 400 }
    );
  }

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host") ?? "";
  const formUrl = `${proto}://${host}/personnel/${client.personnelToken}`;

  const cams = await getCams();
  const cam = cams.find((c) => c.id === client.camId);
  if (!cam) return NextResponse.json({ error: "Assigned CAM not found" }, { status: 500 });

  try {
    await sendPersonnelInviteEmail({
      contactName: client.contactName,
      camName: `${cam.name} ${cam.surname}`,
      camEmail: cam.email,
      clientName: client.name,
      formUrl,
      recipients,
      customBody,
      customSubject,
    });
  } catch (err) {
    console.error("Personnel invite email failed:", err);
    return NextResponse.json(
      { error: "Failed to send email — please try again" },
      { status: 500 }
    );
  }

  await addLog({
    action: "personnel.invite_sent",
    clientId: client.id,
    clientName: client.name,
    details: `Personnel form invite email sent to ${recipients.join(", ")}.`,
    success: true,
  });

  return NextResponse.json({ ok: true });
}
