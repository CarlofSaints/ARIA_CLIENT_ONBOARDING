import { NextResponse } from "next/server";
import { getChecklistItems, saveChecklistItems, ChecklistItemDef } from "@/lib/dataStore";
import { randomUUID } from "crypto";

export async function GET() {
  return NextResponse.json(await getChecklistItems());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { label, description, section, type, dynamic } = body as Partial<ChecklistItemDef>;

  if (!label || !section || !type) {
    return NextResponse.json({ error: "label, section, type required" }, { status: 400 });
  }

  const items = await getChecklistItems();
  const maxOrder = items.reduce((m, i) => Math.max(m, i.order), 0);

  const newItem: ChecklistItemDef = {
    id: `cl-${randomUUID().slice(0, 8)}`,
    label: label.trim(),
    description: description?.trim(),
    section,
    type,
    dynamic: dynamic ?? false,
    order: maxOrder + 1,
    active: true,
  };

  items.push(newItem);
  await saveChecklistItems(items);
  return NextResponse.json(newItem, { status: 201 });
}
