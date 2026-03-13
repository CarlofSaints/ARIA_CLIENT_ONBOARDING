"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type XeroStatus = {
  connected: boolean;
  tenantName?: string;
  expiresAt?: number;
  error?: string;
};

export default function XeroAdminPage() {
  const [status, setStatus] = useState<XeroStatus | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = async () => {
    const data = await fetch("/api/xero/status").then((r) => r.json());
    setStatus(data);
  };

  useEffect(() => {
    fetchStatus();
    // Also check URL params for callback result
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      fetchStatus();
      window.history.replaceState({}, "", "/admin/xero");
    }
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Xero? You will need to re-authorise to use Xero features.")) return;
    setDisconnecting(true);
    await fetch("/api/xero/disconnect", { method: "POST" });
    await fetchStatus();
    setDisconnecting(false);
  };

  const errorParam = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("error")
    : null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">Admin · Control Centre</div>
          <h1 className="text-2xl font-bold text-oj-blue">Xero Integration</h1>
          <p className="text-sm text-oj-muted mt-1">Connect your Xero organisation to create client contacts automatically.</p>
        </div>
        <Link href="/admin" className="text-sm text-oj-muted hover:text-oj-dark border border-oj-border rounded-lg px-4 py-2 transition-colors">
          ← Control Centre
        </Link>
      </div>

      {errorParam && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <strong>OAuth error:</strong> {decodeURIComponent(errorParam)}
        </div>
      )}

      {status === null ? (
        <div className="flex items-center gap-2 text-sm text-oj-muted py-10">
          <span className="animate-spin w-4 h-4 border-2 border-oj-blue border-t-transparent rounded-full inline-block" />
          Checking connection…
        </div>
      ) : status.connected ? (
        <div className="bg-oj-white border border-oj-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-lg">✓</div>
            <div>
              <p className="text-sm font-bold text-oj-dark">Connected to Xero</p>
              <p className="text-xs text-oj-muted">{status.tenantName}</p>
            </div>
          </div>

          {status.expiresAt && (
            <p className="text-xs text-oj-muted mb-5">
              Token expires: {new Date(status.expiresAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}
              &nbsp;(auto-refreshes as needed)
            </p>
          )}

          <div className="flex items-center gap-3 pt-4 border-t border-oj-border">
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {disconnecting ? "Disconnecting…" : "Disconnect Xero"}
            </button>
            <span className="text-xs text-oj-muted">
              Re-authorise: disconnect then connect again.
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-oj-white border border-oj-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-lg">○</div>
            <div>
              <p className="text-sm font-bold text-oj-dark">Not connected</p>
              <p className="text-xs text-oj-muted">Click below to authorise ARIA to access your Xero organisation.</p>
            </div>
          </div>

          <a
            href="/api/xero/auth"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00B4D8] text-white text-sm font-semibold hover:bg-[#0096B4] transition-colors"
          >
            Connect Xero →
          </a>

          <p className="text-xs text-oj-muted mt-4 leading-relaxed">
            You will be redirected to Xero to approve access. ARIA requests read/write access to <strong>Contacts</strong> only. Tokens are stored securely and auto-refresh every 30 minutes.
          </p>
        </div>
      )}
    </div>
  );
}
