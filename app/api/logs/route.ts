import { NextResponse } from "next/server";
import { getLogs } from "@/lib/dataStore";

export async function GET() {
  const logs = await getLogs();
  return NextResponse.json(logs);
}
