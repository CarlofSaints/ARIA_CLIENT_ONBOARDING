import { NextResponse } from "next/server";
import { getChecklistItems, saveChecklistItems } from "@/lib/dataStore";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const items = await getChecklistItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });

  items[idx] = { ...items[idx], ...body, id };
  await saveChecklistItems(items);
  return NextResponse.json(items[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const items = await getChecklistItems();
  const filtered = items.filter((i) => i.id !== id);
  if (filtered.length === items.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await saveChecklistItems(filtered);
  return NextResponse.json({ ok: true });
}
