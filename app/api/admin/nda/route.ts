import { NextResponse } from "next/server";
import { getNdaTemplate, saveNdaTemplate, deleteNdaTemplate } from "@/lib/dataStore";

// GET — returns template metadata (no base64)
export async function GET() {
  const t = await getNdaTemplate();
  if (!t) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: true, fileName: t.fileName, uploadedAt: t.uploadedAt });
}

// PUT — upload new template (body: { fileName, base64 })
export async function PUT(request: Request) {
  const { fileName, base64 } = await request.json() as { fileName: string; base64: string };
  if (!fileName || !base64) return NextResponse.json({ error: "fileName and base64 required" }, { status: 400 });
  await saveNdaTemplate({ fileName, base64, uploadedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

// DELETE — remove template
export async function DELETE() {
  await deleteNdaTemplate();
  return NextResponse.json({ ok: true });
}
