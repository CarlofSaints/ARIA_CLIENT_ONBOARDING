import { NextResponse } from "next/server";
import { getRoles } from "@/lib/dataStore";

export async function GET() {
  return NextResponse.json(await getRoles());
}
