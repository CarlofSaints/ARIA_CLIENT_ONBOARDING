import { NextResponse } from "next/server";
import { getTokens } from "@/lib/xero";

export async function GET() {
  try {
    const tokens = await getTokens();
    if (!tokens) {
      return NextResponse.json({ connected: false });
    }
    return NextResponse.json({
      connected: true,
      tenantName: tokens.tenant_name,
      expiresAt: tokens.expires_at,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
