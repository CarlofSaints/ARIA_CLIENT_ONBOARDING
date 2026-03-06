import { NextResponse } from "next/server";
import { getRoles, saveRoles } from "@/lib/dataStore";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { permissionIds } = body as { permissionIds: string[] };

  const roles = await getRoles();
  const idx = roles.findIndex((r) => r.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  roles[idx].permissionIds = permissionIds;
  await saveRoles(roles);
  return NextResponse.json(roles[idx]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const roles = await getRoles();
  const role = roles.find((r) => r.id === id);
  if (!role) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (role.builtIn) {
    return NextResponse.json({ error: "Cannot delete built-in roles" }, { status: 403 });
  }
  const filtered = roles.filter((r) => r.id !== id);
  await saveRoles(filtered);
  return NextResponse.json({ ok: true });
}
