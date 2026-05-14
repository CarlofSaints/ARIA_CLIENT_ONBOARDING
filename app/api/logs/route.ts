import { NextResponse } from "next/server";
import { getLogs } from "@/lib/dataStore";
import { addLog } from "@/lib/activityLog";

export async function GET() {
  const logs = await getLogs();
  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action, clientId, clientName, userId, userName, details } = body as {
    action: string;
    clientId?: string;
    clientName?: string;
    userId?: string;
    userName?: string;
    details?: string;
  };
  if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });
  await addLog({ action, clientId, clientName, userId, userName, details, success: true });
  return NextResponse.json({ ok: true });
}
