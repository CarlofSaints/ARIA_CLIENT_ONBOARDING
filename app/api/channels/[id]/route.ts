import { NextResponse } from "next/server";
import { getChannels, saveChannels } from "@/lib/dataStore";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, mandateFileName, mandateBase64, mandateEmailSubject, mandateEmailBody } = body as {
    name: string;
    mandateFileName?: string;
    mandateBase64?: string;
    mandateEmailSubject?: string;
    mandateEmailBody?: string;
  };
  const channels = await getChannels();
  const idx = channels.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  channels[idx] = {
    ...channels[idx],
    name: name.trim(),
    mandateFileName,
    mandateBase64,
    mandateEmailSubject,
    mandateEmailBody,
  };
  await saveChannels(channels);
  return NextResponse.json(channels[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const channels = await getChannels();
  const filtered = channels.filter((c) => c.id !== id);
  if (filtered.length === channels.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await saveChannels(filtered);
  return NextResponse.json({ ok: true });
}
