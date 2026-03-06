import { NextResponse } from "next/server";
import { getChannels, saveChannels, Channel } from "@/lib/dataStore";
import { randomUUID } from "crypto";

export async function GET() {
  const channels = await getChannels();
  return NextResponse.json(channels);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name } = body as { name: string };
  if (!name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const channels = await getChannels();
  const newChannel: Channel = { id: `ch-${randomUUID()}`, name: name.trim() };
  channels.push(newChannel);
  await saveChannels(channels);
  return NextResponse.json(newChannel, { status: 201 });
}
