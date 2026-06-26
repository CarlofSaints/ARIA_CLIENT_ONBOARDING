import { NextResponse } from "next/server";

// TEMPORARY diagnostic — remove once Dropbox is confirmed working.
// Reports what the running app actually sees for the Dropbox env vars (lengths +
// a few chars, never the full secret) and attempts the real token exchange.
export const dynamic = "force-dynamic";

export async function GET() {
  const rawKey = process.env.DROPBOX_APP_KEY ?? "";
  const rawSecret = process.env.DROPBOX_APP_SECRET ?? "";
  const rawToken = process.env.DROPBOX_REFRESH_TOKEN ?? "";

  const info: Record<string, unknown> = {
    vercelEnv: process.env.VERCEL_ENV ?? null,
    appKey: { rawLen: rawKey.length, value: rawKey.trim() }, // key is not secret
    appSecret: {
      rawLen: rawSecret.length,
      trimmedLen: rawSecret.trim().length,
      first2: rawSecret.trim().slice(0, 2),
      last2: rawSecret.trim().slice(-2),
    },
    refreshToken: {
      rawLen: rawToken.length,
      trimmedLen: rawToken.trim().length,
      first6: rawToken.trim().slice(0, 6),
      last6: rawToken.trim().slice(-6),
      lastCharCode: rawToken.length ? rawToken.charCodeAt(rawToken.length - 1) : null,
    },
  };

  // Run the real exchange with the trimmed production values — returns only the
  // error/success, never the access token itself.
  try {
    const res = await fetch("https://api.dropbox.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: rawToken.trim(),
        client_id: rawKey.trim(),
        client_secret: rawSecret.trim(),
      }).toString(),
    });
    const data = await res.json();
    info.tokenExchange = {
      ok: res.ok && !!data.access_token,
      status: res.status,
      gotAccessToken: !!data.access_token,
      error: data.error ?? null,
      errorDescription: data.error_description ?? null,
    };
  } catch (e) {
    info.tokenExchange = { ok: false, error: (e as Error).message };
  }

  return NextResponse.json(info);
}
