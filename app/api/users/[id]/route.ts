import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { after } from "next/server";
import { getUsers, saveUsers } from "@/lib/dataStore";
import { sendUserWelcomeEmail } from "@/lib/email";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, surname, email, cell, roleId, active, password, forcePasswordChange, notifyUser } = body as {
    name?: string;
    surname?: string;
    email?: string;
    cell?: string;
    roleId?: string;
    active?: boolean;
    password?: string;
    forcePasswordChange?: boolean;
    notifyUser?: boolean;
  };

  const users = await getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (name !== undefined) users[idx].name = name.trim();
  if (surname !== undefined) users[idx].surname = surname.trim();
  if (email !== undefined) users[idx].email = email.trim().toLowerCase();
  if (cell !== undefined) users[idx].cell = cell.trim();
  if (roleId !== undefined) users[idx].roleId = roleId;
  if (active !== undefined) users[idx].active = active;
  if (forcePasswordChange !== undefined) users[idx].forcePasswordChange = forcePasswordChange;
  if (password) {
    users[idx].passwordHash = await bcrypt.hash(password, 10);
  }

  await saveUsers(users);

  if (notifyUser && password) {
    const recipientName = users[idx].name;
    const recipientEmail = users[idx].email;
    after(async () => {
      try {
        await sendUserWelcomeEmail({ name: recipientName, email: recipientEmail, password });
      } catch (e) {
        console.error("[users/[id] PUT] sendUserWelcomeEmail failed:", e);
      }
    });
  }

  const { passwordHash: _, ...safe } = users[idx];
  return NextResponse.json(safe);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const users = await getUsers();
  const filtered = users.filter((u) => u.id !== id);
  if (filtered.length === users.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await saveUsers(filtered);
  return NextResponse.json({ ok: true });
}
