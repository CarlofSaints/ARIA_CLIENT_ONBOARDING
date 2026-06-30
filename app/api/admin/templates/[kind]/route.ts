import { NextResponse } from "next/server";
import { getTemplate, saveTemplate, deleteTemplate, type DocTemplateKind } from "@/lib/dataStore";

const VALID_KINDS: DocTemplateKind[] = ["nda", "sla", "eula"];

function parseKind(kind: string): DocTemplateKind | null {
  return (VALID_KINDS as string[]).includes(kind) ? (kind as DocTemplateKind) : null;
}

// GET — returns template metadata (no base64)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const k = parseKind(kind);
  if (!k) return NextResponse.json({ error: "Invalid template kind" }, { status: 400 });
  const t = await getTemplate(k);
  if (!t) return NextResponse.json({ exists: false });
  return NextResponse.json({ exists: true, fileName: t.fileName, uploadedAt: t.uploadedAt });
}

// PUT — upload new template (body: { fileName, base64 })
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const k = parseKind(kind);
  if (!k) return NextResponse.json({ error: "Invalid template kind" }, { status: 400 });
  const { fileName, base64 } = await request.json() as { fileName: string; base64: string };
  if (!fileName || !base64) return NextResponse.json({ error: "fileName and base64 required" }, { status: 400 });
  await saveTemplate(k, { fileName, base64, uploadedAt: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

// DELETE — remove template
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const k = parseKind(kind);
  if (!k) return NextResponse.json({ error: "Invalid template kind" }, { status: 400 });
  await deleteTemplate(k);
  return NextResponse.json({ ok: true });
}
