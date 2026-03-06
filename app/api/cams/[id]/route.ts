import { NextResponse } from "next/server";
import { getCams, saveCams } from "@/lib/dataStore";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, surname, email, cell } = body as { name: string; surname: string; email: string; cell?: string };
  const cams = await getCams();
  const idx = cams.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
  cams[idx] = { ...cams[idx], name: name.trim(), surname: surname.trim(), email: email.trim(), cell: (cell ?? "").trim() };
  await saveCams(cams);
  return NextResponse.json(cams[idx]);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cams = await getCams();
  const filtered = cams.filter((c) => c.id !== id);
  if (filtered.length === cams.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await saveCams(filtered);
  return NextResponse.json({ ok: true });
}
