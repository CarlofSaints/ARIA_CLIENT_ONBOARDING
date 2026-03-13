import { NextResponse } from "next/server";
import { getPersonnelConfig, savePersonnelConfig } from "@/lib/dataStore";

export async function GET() {
  const config = await getPersonnelConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const body = await request.json();
  if (!body.roleOptions || !Array.isArray(body.roleOptions)) {
    return NextResponse.json({ error: "Invalid config: roleOptions required" }, { status: 400 });
  }
  if (!body.customFields || !Array.isArray(body.customFields)) {
    return NextResponse.json({ error: "Invalid config: customFields required" }, { status: 400 });
  }
  await savePersonnelConfig(body);
  return NextResponse.json(body);
}
