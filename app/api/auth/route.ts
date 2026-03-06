import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUsers, getRoles, saveUsers } from "@/lib/dataStore";
import { sendAdminFirstLoginNotification } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body as { email: string; password: string };

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password required" }, { status: 400 });
  }

  const users = await getUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user || !user.active) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const roles = await getRoles();
  const role = roles.find((r) => r.id === user.roleId);

  const isFirstLogin = !user.firstLoginAt;
  if (isFirstLogin) {
    const idx = users.findIndex((u) => u.id === user.id);
    users[idx].firstLoginAt = new Date().toISOString();
    await saveUsers(users);

    const adminEmails = users
      .filter((u) => u.active && u.roleId === "role-site-admin" && u.id !== user.id)
      .map((u) => u.email);

    if (adminEmails.length > 0) {
      sendAdminFirstLoginNotification({
        userName: `${user.name} ${user.surname}`,
        userEmail: user.email,
        loginAt: users[idx].firstLoginAt!,
        adminEmails,
      }).catch((err) => console.error("First-login admin notification error:", err));
    }
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleId: user.roleId,
      roleName: role?.name ?? user.roleId,
      forcePasswordChange: user.forcePasswordChange ?? false,
    },
  });
}
