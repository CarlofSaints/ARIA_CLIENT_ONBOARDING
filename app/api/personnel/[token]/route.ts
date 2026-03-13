import { NextResponse, after } from "next/server";
import {
  getClients, saveClients,
  getPersonnelConfig, getChannels, getCams,
  type PersonnelRow,
} from "@/lib/dataStore";
import { buildPersonnelExcel } from "@/lib/personnelExcel";
import { uploadPersonnelFile } from "@/lib/personnelSP";
import { sendPersonnelCamEmail, sendPersonnelClientEmail } from "@/lib/email";
import { addLog } from "@/lib/activityLog";

// ---- GET — public, no auth -------------------------------------------
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const clients = await getClients();
  const client = clients.find((c) => c.personnelToken === token);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [personnelConfig, allChannels] = await Promise.all([
    getPersonnelConfig(),
    getChannels(),
  ]);

  const channels = allChannels.filter((ch) => client.channelIds.includes(ch.id));

  return NextResponse.json({
    clientName: client.name,
    channels,
    personnelConfig,
    alreadySubmitted: !!client.personnelSubmittedAt,
    submittedAt: client.personnelSubmittedAt ?? null,
    spUrl: client.personnelSpUrl ?? null,
    submission: client.personnelSubmission ?? null,
  });
}

// ---- POST — public, no auth ------------------------------------------
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const body = await request.json();
  const rows: PersonnelRow[] = body.rows;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }

  const clients = await getClients();
  const idx = clients.findIndex((c) => c.personnelToken === token);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });


  const client = clients[idx];
  const personnelConfig = await getPersonnelConfig();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const fileName = `${client.name} – ${dateStr} – Personnel File.xlsx`;

  // 1. Build Excel
  const excelBuffer = await buildPersonnelExcel(client.name, rows, personnelConfig.customFields);

  // 2. Upload to SharePoint (non-fatal)
  let spUrl: string | undefined;
  try {
    const result = await uploadPersonnelFile(excelBuffer, client.name, fileName);
    spUrl = result.webUrl;
  } catch (err) {
    console.warn("Personnel SP upload failed (non-fatal):", err);
  }

  // 3. Persist submission
  const freshClients = await getClients();
  const freshIdx = freshClients.findIndex((c) => c.personnelToken === token);
  if (freshIdx !== -1) {
    freshClients[freshIdx].personnelSubmission = rows;
    freshClients[freshIdx].personnelSubmittedAt = now.toISOString();
    if (spUrl) freshClients[freshIdx].personnelSpUrl = spUrl;

    // 4. Auto-check cl-personnel-info if not already done
    const cl = freshClients[freshIdx].checklist ?? {};
    if (!cl["cl-personnel-info"]?.completed) {
      cl["cl-personnel-info"] = {
        completed: true,
        completedAt: now.toISOString(),
        completedBy: "system",
      };
      freshClients[freshIdx].checklist = cl;
    }

    await saveClients(freshClients);
  }

  // 5. Send emails after response (after() prevents Vercel from killing the function)
  const camId = client.camId;
  const clientEmails = client.emails ?? [];
  const clientName = client.name;

  after(async () => {
    const cams = await getCams();
    const cam = cams.find((c) => c.id === camId);
    if (cam) {
      try {
        await sendPersonnelCamEmail({
          camName: cam.name,
          camEmail: cam.email,
          clientName,
          rowCount: rows.length,
          spUrl,
          excelBuffer,
          fileName,
        });
      } catch (e) {
        console.error("Personnel CAM email failed:", e);
      }
    }

    if (clientEmails.length > 0) {
      try {
        await sendPersonnelClientEmail({
          clientName,
          recipients: clientEmails,
          excelBuffer,
          fileName,
        });
      } catch (e) {
        console.error("Personnel client email failed:", e);
      }
    }
  });

  await addLog({
    action: "personnel.submitted",
    clientId: client.id,
    clientName: client.name,
    details: `Personnel form submitted with ${rows.length} ${rows.length === 1 ? "person" : "people"}.${spUrl ? " Saved to SharePoint." : ""}`,
    success: true,
  });

  await addLog({
    action: "checklist.toggle",
    clientId: client.id,
    clientName: client.name,
    userName: "system",
    details: `"Personnel information received" auto-checked on form submission.`,
    success: true,
  });

  return NextResponse.json({ ok: true, spUrl: spUrl ?? null });
}
