"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { setSession, getSession } from "@/lib/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (s) {
      if (s.forcePasswordChange) router.replace("/change-password");
      else router.replace("/");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Invalid credentials");
        return;
      }
      setSession(data.user);
      if (data.user.forcePasswordChange) {
        router.replace("/change-password");
      } else {
        router.replace("/");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-oj-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-oj-white rounded-2xl shadow-sm border border-oj-border p-8">
          <div className="flex flex-col items-center mb-8">
            <Image src="/aria-logo.png" alt="ARIA" width={120} height={48}
              className="h-12 w-auto object-contain mb-2" priority />
            <p className="text-sm text-oj-muted mt-1">OuterJoin Client Onboarding Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-oj-dark mb-1">Email address</label>
              <input type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent"
                placeholder="you@outerjoin.co.za" />
            </div>
            <div>
              <label className="block text-sm font-medium text-oj-dark mb-1">Password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent pr-14"
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-oj-muted hover:text-oj-dark text-xs font-medium select-none">
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-oj-blue hover:bg-oj-blue-hover text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60">
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-oj-muted mt-6">© {new Date().getFullYear()} OuterJoin (Pty) Ltd</p>
      </div>
    </div>
  );
}
