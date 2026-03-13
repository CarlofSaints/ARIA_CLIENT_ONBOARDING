"use client";

import { useState, useEffect } from "react";

type CognitoEntry = Record<string, unknown>;

// Fields to skip when rendering — system/internal Cognito fields
const SKIP_KEYS = new Set([
  "Id", "InternalId", "FormId", "Form", "Organization",
  "Entry", "EntryId", "Status", "AdminStatus",
  "DateCreated", "DateUpdated", "DateSubmitted",
  "Revision", "ContentType", "ExternalId",
]);

function getDisplayLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function getEntryPreview(entry: CognitoEntry): string {
  // Try to find the most useful identifier string — company name or first long string field
  const candidates = Object.entries(entry)
    .filter(([k, v]) => !SKIP_KEYS.has(k) && typeof v === "string" && (v as string).length > 1)
    .sort(([, a], [, b]) => (b as string).length - (a as string).length);
  return (candidates[0]?.[1] as string) ?? `Entry #${entry.Number ?? entry.Id ?? "?"}`;
}

type Props = {
  clientId: string;
  onLinked: (data: Record<string, unknown>) => void;
  onClose: () => void;
  session?: { id: string; name: string; surname: string } | null;
};

export default function CognitoLinkModal({ clientId, onLinked, onClose, session }: Props) {
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<CognitoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<CognitoEntry | null>(null);

  const fetchEntries = async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const url = q ? `/api/cognito/entries?search=${encodeURIComponent(q)}` : "/api/cognito/entries";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to load entries"); setEntries([]); return; }
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setError("Network error loading entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(""); }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchEntries(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleLink = async (entry: CognitoEntry) => {
    const entryId = entry.Id ?? entry.Number;
    if (!entryId) return;
    setLinking(String(entryId));
    try {
      const res = await fetch(`/api/clients/${clientId}/cognito-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: String(entryId),
          userId: session?.id,
          userName: session ? `${session.name} ${session.surname}` : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onLinked(data.cognitoData ?? entry);
      } else {
        setError(data.error ?? "Failed to link entry");
      }
    } finally {
      setLinking(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-oj-border">
          <h2 className="text-base font-bold text-oj-dark">Link Cognito Entry</h2>
          <p className="text-xs text-oj-muted mt-0.5">Search and select the matching billing submission for this client.</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-oj-border">
          <input
            type="text"
            placeholder="Search by company name, email, contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full border border-oj-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-oj-blue placeholder:text-oj-muted"
          />
        </div>

        {/* Two-pane: list + preview */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Entry list */}
          <div className="w-1/2 border-r border-oj-border overflow-y-auto">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 m-3 rounded-lg border border-red-200">{error}</div>
            )}
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-oj-muted text-sm">
                <span className="animate-spin w-4 h-4 border-2 border-oj-blue border-t-transparent rounded-full inline-block"></span>
                Loading…
              </div>
            ) : entries.length === 0 ? (
              <div className="p-6 text-center text-sm text-oj-muted">No entries found.</div>
            ) : (
              <ul className="divide-y divide-oj-border">
                {entries.map((entry, i) => {
                  const entryId = String(entry.Id ?? entry.Number ?? i);
                  const preview_ = getEntryPreview(entry);
                  const num = entry.Number ?? entry.Id;
                  const date = entry.DateSubmitted ?? entry.DateCreated;
                  const isLinking = linking === entryId;
                  return (
                    <li
                      key={entryId}
                      onClick={() => setPreview(entry)}
                      className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-oj-bg/60 transition-colors ${preview === entry ? "bg-oj-blue/5 border-l-2 border-oj-blue" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-oj-dark truncate">{preview_}</p>
                        <p className="text-xs text-oj-muted mt-0.5">
                          {num ? `#${num}` : ""}
                          {date ? ` · ${new Date(date as string).toLocaleDateString("en-ZA")}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleLink(entry); }}
                        disabled={!!linking}
                        className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-oj-blue text-white rounded-lg hover:bg-oj-blue-hover transition-colors disabled:opacity-50"
                      >
                        {isLinking ? "Linking…" : "Link"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Field preview */}
          <div className="w-1/2 overflow-y-auto p-4">
            {preview ? (
              <div className="space-y-2">
                <p className="text-xs font-bold text-oj-muted uppercase tracking-wider mb-3">Entry Fields</p>
                {Object.entries(preview)
                  .filter(([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== undefined && v !== "")
                  .map(([k, v]) => (
                    <div key={k} className="text-sm">
                      <span className="text-xs font-semibold text-oj-muted block">{getDisplayLabel(k)}</span>
                      <span className="text-oj-dark break-words">
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-oj-muted text-center">
                Click an entry on the left to preview its fields
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-oj-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-oj-muted border border-oj-border rounded-lg hover:text-oj-dark transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
