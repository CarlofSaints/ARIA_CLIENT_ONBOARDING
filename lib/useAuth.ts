"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export type Session = {
  id: string;
  name: string;
  surname: string;
  email: string;
  roleId: string;
  roleName: string;
  forcePasswordChange?: boolean;
};

const SESSION_KEY = "oj_session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Hook that guards a page:
 * - Redirects to /login if no session
 * - Redirects to /change-password if forcePasswordChange is set
 */
export function useAuth(): { session: Session | null; ready: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSessionState] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login");
      return;
    }
    if (s.forcePasswordChange && pathname !== "/change-password") {
      router.replace("/change-password");
      return;
    }
    setSessionState(s);
    setReady(true);
  }, [router, pathname]);

  return { session, ready };
}
