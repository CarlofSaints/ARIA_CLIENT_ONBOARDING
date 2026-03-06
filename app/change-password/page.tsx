"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSession, setSession, clearSession } from "@/lib/useAuth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const session = getSession();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!session) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  const mismatch = !!confirm && password !== confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${session!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, forcePasswordChange: false }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to update password");
        return;
      }
      // Update session — remove forcePasswordChange flag
      setSession({ ...session!, forcePasswordChange: false });
      router.replace("/");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-oj-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-oj-white rounded-2xl shadow-sm border border-oj-border p-8">
          <div className="flex flex-col items-center mb-6">
            <Image src="/aria-logo.png" alt="ARIA" width={100} height={40}
              className="h-10 w-auto object-contain mb-2" priority />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-amber-800 font-medium">Password change required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Hey {session.name}, you need to set a new password before continuing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-oj-dark mb-1">New password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)} minLength={6}
                  className="w-full border border-oj-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue pr-14"
                  placeholder="Minimum 6 characters" />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-oj-muted hover:text-oj-dark text-xs font-medium select-none">
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-oj-dark mb-1">Confirm new password</label>
              <div className="relative">
                <input type={showPw ? "text" : "password"} required value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue pr-10 ${mismatch ? "border-red-400 bg-red-50" : "border-oj-border"}`}
                  placeholder="Repeat password" />
                {confirm && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${mismatch ? "text-red-500" : "text-green-500"}`}>
                    {mismatch ? "✗" : "✓"}
                  </span>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={saving || mismatch}
              className="w-full bg-oj-blue hover:bg-oj-blue-hover text-white font-medium py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60">
              {saving ? "Saving…" : "Set New Password"}
            </button>
          </form>

          <button onClick={() => { clearSession(); router.push("/login"); }}
            className="w-full mt-3 text-xs text-oj-muted hover:text-oj-dark text-center">
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}
