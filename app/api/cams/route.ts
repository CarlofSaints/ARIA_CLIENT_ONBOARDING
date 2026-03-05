import { NextResponse } from "next/server";
import { getCams, saveCams, CAM } from "@/lib/dataStore";
import { randomUUID } from "crypto";

export async function GET() {
  const cams = getCams();
  return NextResponse.json(cams);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email } = body as { name: string; email: string };
  if (!name || !email) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }
  const cams = getCams();
  const newCam: CAM = { id: `cam-${randomUUID()}`, name: name.trim(), email: email.trim() };
  cams.push(newCam);
  saveCams(cams);
  return NextResponse.json(newCam, { status: 201 });
}
