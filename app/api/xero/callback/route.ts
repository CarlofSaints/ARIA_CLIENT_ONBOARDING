import { NextResponse } from "next/server";
import { exchangeCode, verifyAndDeleteState } from "@/lib/xero";

// GET /api/xero/callback — Xero redirects here after user approves
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `https://aria.outerjoin.co.za/admin/xero?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      "https://aria.outerjoin.co.za/admin/xero?error=missing_params"
    );
  }

  const validState = await verifyAndDeleteState(state);
  if (!validState) {
    return NextResponse.redirect(
      "https://aria.outerjoin.co.za/admin/xero?error=invalid_state"
    );
  }

  try {
    await exchangeCode(code);
    return NextResponse.redirect(
      "https://aria.outerjoin.co.za/admin/xero?connected=1"
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.redirect(
      `https://aria.outerjoin.co.za/admin/xero?error=${encodeURIComponent(msg)}`
    );
  }
}
