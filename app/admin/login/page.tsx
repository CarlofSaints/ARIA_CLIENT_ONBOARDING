"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (data.ok) {
      localStorage.setItem("oj_admin", "1");
      router.push("/admin");
    } else {
      setError("Incorrect password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-bold text-oj-orange tracking-widest mb-2 uppercase">
            Admin Access
          </div>
          <h1 className="text-2xl font-bold text-oj-blue">Control Centre</h1>
          <p className="text-sm text-oj-muted mt-1">
            OuterJoin administrator access only.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-oj-white border border-oj-border rounded-xl p-8 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold text-oj-dark mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm text-oj-dark focus:outline-none focus:ring-2 focus:ring-oj-blue focus:border-transparent"
              placeholder="Enter admin password"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-oj-orange font-medium">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-oj-blue text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
