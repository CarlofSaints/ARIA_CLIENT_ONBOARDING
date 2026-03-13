import { NextResponse } from "next/server";
import { after } from "next/server";
import { getUsers } from "@/lib/dataStore";
import { sendUserNotificationEmail } from "@/lib/email";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const users = await getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const recipientName = user.name;
  const recipientEmail = user.email;

  after(async () => {
    try {
      await sendUserNotificationEmail({ name: recipientName, email: recipientEmail });
    } catch (e) {
      console.error("[users/[id]/notify] sendUserNotificationEmail failed:", e);
    }
  });

  return NextResponse.json({ ok: true });
}
