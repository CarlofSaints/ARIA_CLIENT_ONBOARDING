import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body as { password: string };
  const adminPassword = process.env.ADMIN_PASSWORD ?? "aria2026";
  if (password === adminPassword) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
