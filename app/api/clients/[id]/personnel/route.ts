import { NextResponse } from "next/server";
import {
  getClients, saveClients, getPersonnelConfig,
  type PersonnelRow,
} from "@/lib/dataStore";
import { buildPersonnelExcel } from "@/lib/personnelExcel";
import { uploadPersonnelFile } from "@/lib/personnelSP";
import { addLog } from "@/lib/activityLog";

// PUT — authenticated (CAM edits an existing submission)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const rows: PersonnelRow[] = body.rows;

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }

  const clients = await getClients();
  const idx = clients.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const client = clients[idx];
  const personnelConfig = await getPersonnelConfig();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const fileName = `${client.name} – ${dateStr} – Personnel File.xlsx`;

  // Rebuild Excel
  const excelBuffer = await buildPersonnelExcel(client.name, rows, personnelConfig.customFields);

  // Re-upload to SP (overwrites if same date, creates new file otherwise)
  let spUrl: string | undefined;
  try {
    const result = await uploadPersonnelFile(excelBuffer, client.name, fileName);
    spUrl = result.webUrl;
  } catch (err) {
    console.warn("Personnel SP re-upload failed (non-fatal):", err);
  }

  // Persist
  const freshClients = await getClients();
  const freshIdx = freshClients.findIndex((c) => c.id === id);
  if (freshIdx !== -1) {
    freshClients[freshIdx].personnelSubmission = rows;
    freshClients[freshIdx].personnelSubmittedAt = now.toISOString();
    if (spUrl) freshClients[freshIdx].personnelSpUrl = spUrl;
    await saveClients(freshClients);
  }

  await addLog({
    action: "personnel.edited",
    clientId: client.id,
    clientName: client.name,
    details: `Personnel form edited by CAM. ${rows.length} ${rows.length === 1 ? "person" : "people"}.${spUrl ? " Updated in SharePoint." : ""}`,
    success: true,
  });

  return NextResponse.json({ ok: true, spUrl: spUrl ?? null });
}
