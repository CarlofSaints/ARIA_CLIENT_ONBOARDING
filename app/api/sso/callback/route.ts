import { NextRequest, NextResponse } from 'next/server';
import { verifySSOToken } from '@/lib/sso';
import { getUsers, saveUsers, getRoles } from '@/lib/dataStore';

const MODULE_SLUG = 'iram-client-onboarding';

export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const secret = process.env.IRAM_SSO_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SSO not configured' }, { status: 500 });
  }

  const payload = verifySSOToken(token, secret);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired SSO token' }, { status: 401 });
  }

  // Check module access
  if (!payload.modules.includes(MODULE_SLUG)) {
    return NextResponse.json(
      { error: 'You do not have access to Client Onboarding' },
      { status: 403 },
    );
  }

  const users = await getUsers();

  // Find existing user by email (case-insensitive)
  let user = users.find(u => u.email.toLowerCase() === payload.email.toLowerCase());

  if (!user) {
    // Create new user with default role
    user = {
      id: crypto.randomUUID(),
      name: payload.name,
      surname: payload.surname,
      email: payload.email,
      cell: '',
      roleId: 'role-cam',
      passwordHash: '', // No password — SSO-only user
      active: true,
      forcePasswordChange: false,
      firstLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    await saveUsers(users);
  }

  // Resolve role name
  const roles = await getRoles();
  const role = roles.find(r => r.id === user.roleId);

  // Return session matching oj_session format
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
