import { NextResponse } from "next/server";
import { getPermissions } from "@/lib/dataStore";

export async function GET() {
  return NextResponse.json(await getPermissions());
}
