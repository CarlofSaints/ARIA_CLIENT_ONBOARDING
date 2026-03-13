"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ActivityLog = {
  id: string;
  timestamp: string;
  action: string;
  clientId?: string;
  clientName?: string;
  userId?: string;
  userName?: string;
  details?: string;
  success: boolean;
  error?: string;
};

const ACTION_META: Record<string, { label: string; color: string }> = {
  "client.created":       { label: "Client Created",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  "email.welcome":        { label: "Welcome Email",         color: "bg-purple-100 text-purple-700 border-purple-200" },
  "email.cam-notification": { label: "CAM Notification",    color: "bg-pink-100 text-pink-700 border-pink-200" },
  "sharepoint.created":   { label: "SharePoint",            color: "bg-teal-100 text-teal-700 border-teal-200" },
  "teams.created":        { label: "Teams",                 color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  "personnel.submitted":  { label: "Personnel Submitted",   color: "bg-green-100 text-green-700 border-green-200" },
  "personnel.edited":     { label: "Personnel Edited",      color: "bg-amber-100 text-amber-700 border-amber-200" },
  "checklist.toggle":     { label: "Checklist",             color: "bg-gray-100 text-gray-700 border-gray-200" },
  "email.mandate":        { label: "Mandate Email",         color: "bg-orange-100 text-orange-700 border-orange-200" },
  "cognito.linked":       { label: "Cognito Linked",        color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  "xero.contact":         { label: "Xero Contact",          color: "bg-sky-100 text-sky-700 border-sky-200" },
};

function getActionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, color: "bg-gray-100 text-gray-600 border-gray-200" };
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" }),
    time: d.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Africa/Johannesburg" }),
  };
}

const ALL_ACTIONS = ["all", ...Object.keys(ACTION_META)];
const STATUS_FILTERS = ["all", "success", "failed"] as const;

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("all");
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await fetch("/api/logs").then((r) => r.json());
      setLogs(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (statusFilter === "success" && !log.success) return false;
    if (statusFilter === "failed" && log.success) return false;
    return true;
  });

  const successCount = filtered.filter((l) => l.success).length;
  const failedCount = filtered.filter((l) => !l.success).length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="text-xs font-bold text-oj-orange tracking-widest mb-1 uppercase">Admin · Control Centre</div>
          <h1 className="text-2xl font-bold text-oj-blue">Activity Log</h1>
          <p className="text-sm text-oj-muted mt-1">All system events — processes, emails, checklist changes, and user actions.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-sm text-oj-muted border border-oj-border rounded-lg px-4 py-2 hover:border-oj-blue transition-colors disabled:opacity-50"
          >
            <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>↻</span> Refresh
          </button>
          <Link href="/admin" className="text-sm text-oj-muted hover:text-oj-dark border border-oj-border rounded-lg px-4 py-2 transition-colors">
            ← Control Centre
          </Link>
        </div>
      </div>

      {/* Filters + stats */}
      <div className="bg-oj-white border border-oj-border rounded-xl p-4 mb-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-sm border border-oj-border rounded-lg px-3 py-1.5 bg-white text-oj-dark focus:outline-none focus:ring-2 focus:ring-oj-blue"
          >
            <option value="all">All actions</option>
            {Object.entries(ACTION_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.label}</option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex rounded-lg border border-oj-border overflow-hidden text-sm">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 font-medium capitalize transition-colors ${
                  statusFilter === f
                    ? "bg-oj-blue text-white"
                    : "bg-white text-oj-muted hover:bg-oj-bg"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-4 text-sm">
          <span className="text-oj-muted">{filtered.length} entries</span>
          {successCount > 0 && <span className="text-green-600 font-medium">✓ {successCount} ok</span>}
          {failedCount > 0 && <span className="text-red-500 font-medium">✗ {failedCount} failed</span>}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-oj-muted">
          <span className="animate-spin w-5 h-5 border-2 border-oj-blue border-t-transparent rounded-full inline-block"></span>
          <span className="text-sm">Loading…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-oj-muted text-sm">No log entries match your filters.</div>
      ) : (
        <div className="bg-oj-white border border-oj-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-oj-bg border-b border-oj-border">
                  <th className="text-left px-4 py-3 text-xs font-bold text-oj-muted uppercase tracking-wide w-[160px]">Date &amp; Time</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-oj-muted uppercase tracking-wide w-[140px]">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-oj-muted uppercase tracking-wide w-[140px]">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-oj-muted uppercase tracking-wide w-[130px]">User</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-oj-muted uppercase tracking-wide">Details</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-oj-muted uppercase tracking-wide w-[80px]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-oj-border">
                {filtered.map((log) => {
                  const { date, time } = formatTimestamp(log.timestamp);
                  const meta = getActionMeta(log.action);
                  const isExpanded = expandedError === log.id;
                  return (
                    <tr key={log.id} className="hover:bg-oj-bg/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-oj-dark font-medium">{date}</span>
                        <span className="block text-xs text-oj-muted">{time}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.clientName ? (
                          log.clientId ? (
                            <Link href={`/clients/${log.clientId}`} className="text-oj-blue hover:underline text-sm font-medium">
                              {log.clientName}
                            </Link>
                          ) : (
                            <span className="text-sm text-oj-dark">{log.clientName}</span>
                          )
                        ) : (
                          <span className="text-oj-muted text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${log.userName === "system" ? "text-oj-muted italic" : "text-oj-dark"}`}>
                          {log.userName ?? <span className="text-oj-muted">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-oj-dark leading-snug">{log.details}</span>
                        {log.error && (
                          <div className="mt-1">
                            <button
                              onClick={() => setExpandedError(isExpanded ? null : log.id)}
                              className="text-xs text-red-500 hover:text-red-700 font-medium"
                            >
                              {isExpanded ? "▲ Hide error" : "▼ Show error"}
                            </button>
                            {isExpanded && (
                              <div className="mt-1 bg-red-50 border border-red-200 rounded px-3 py-2 text-xs text-red-700 font-mono break-all">
                                {log.error}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.success ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                            <span className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-[10px]">✓</span>
                            OK
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                            <span className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-[10px]">✗</span>
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
