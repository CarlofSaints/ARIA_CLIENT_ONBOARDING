import { NextResponse } from "next/server";
import { getCams, saveCams, CAM } from "@/lib/dataStore";
import { randomUUID } from "crypto";

export async function GET() {
  return NextResponse.json(await getCams());
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, surname, email, cell } = body as { name: string; surname: string; email: string; cell?: string };
  if (!name || !surname || !email) {
    return NextResponse.json({ error: "name, surname and email required" }, { status: 400 });
  }
  const cams = await getCams();
  const newCam: CAM = {
    id: `cam-${randomUUID()}`,
    name: name.trim(),
    surname: surname.trim(),
    email: email.trim(),
    cell: (cell ?? "").trim(),
  };
  cams.push(newCam);
  await saveCams(cams);
  return NextResponse.json(newCam, { status: 201 });
}
