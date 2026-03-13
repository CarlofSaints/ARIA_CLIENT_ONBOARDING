import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/xero";

export async function POST() {
  try {
    await clearTokens();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
