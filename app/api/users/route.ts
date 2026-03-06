import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getUsers, saveUsers, User } from "@/lib/dataStore";
import { randomUUID } from "crypto";
import { sendUserWelcomeEmail } from "@/lib/email";

export async function GET() {
  const users = await getUsers();
  return NextResponse.json(users.map(({ passwordHash: _, ...u }) => u));
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, surname, email, cell, roleId, password, notifyUser, forcePasswordChange } = body as {
    name: string;
    surname: string;
    email: string;
    cell: string;
    roleId: string;
    password: string;
    notifyUser?: boolean;
    forcePasswordChange?: boolean;
  };

  if (!name || !surname || !email || !roleId || !password) {
    return NextResponse.json({ error: "name, surname, email, roleId, password required" }, { status: 400 });
  }

  const users = await getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: `user-${randomUUID()}`,
    name: name.trim(),
    surname: surname.trim(),
    email: email.trim().toLowerCase(),
    cell: (cell ?? "").trim(),
    roleId,
    passwordHash,
    active: true,
    forcePasswordChange: forcePasswordChange ?? false,
    firstLoginAt: null,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsers(users);

  if (notifyUser) {
    sendUserWelcomeEmail({
      name: newUser.name,
      email: newUser.email,
      password,
    }).catch((err) => console.error("User welcome email error:", err));
  }

  const { passwordHash: _, ...safe } = newUser;
  return NextResponse.json(safe, { status: 201 });
}
