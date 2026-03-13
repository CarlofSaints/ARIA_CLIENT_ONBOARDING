import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { buildAuthUrl, saveState } from "@/lib/xero";

// GET /api/xero/auth — redirect user to Xero OAuth consent screen
export async function GET() {
  try {
    const state = randomUUID();
    await saveState(state);
    const url = buildAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
