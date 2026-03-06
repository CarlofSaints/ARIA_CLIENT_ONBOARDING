"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import ScoreGauge from "@/components/ScoreGauge";

type ChecklistItemDef = {
  id: string;
  label: string;
  description?: string;
  section: string;
  type: "manual" | "auto" | "either";
  dynamic: boolean;
  order: number;
  active: boolean;
};

type ChecklistItemState = {
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  channelStates?: Record<string, { completed: boolean; completedAt?: string }>;
};

type Client = {
  id: string;
  name: string;
  logoBase64?: string;
  website?: string;
  camId: string;
  emails: string[];
  startDate: string;
  channelIds: string[];
  contactName: string;
  status: string;
  checklist: Record<string, ChecklistItemState>;
  createdAt: string;
  sharepointStatus?: "created" | "error";
  teamsStatus?: "creating" | "created" | "error";
  teamsId?: string;
};

type CAM = { id: string; name: string; surname: string; email: string };
type Channel = { id: string; name: string };

const SECTIONS: { value: string; label: string }[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "legal", label: "Legal & Compliance" },
  { value: "channels", label: "Channels" },
  { value: "technical", label: "Technical Setup" },
  { value: "training", label: "Training & Handover" },
];

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  manual: { label: "manual", cls: "bg-blue-50 text-blue-600 border border-blue-200" },
  auto: { label: "auto", cls: "bg-green-50 text-green-600 border border-green-200" },
  either: { label: "either", cls: "bg-amber-50 text-amber-600 border border-amber-200" },
};

function computeScore(
  defs: ChecklistItemDef[],
  checklist: Record<string, ChecklistItemState>,
  channelIds: string[]
): number {
  const active = defs.filter((i) => i.active);
  if (active.length === 0) return 0;
  let total = 0;
  let earned = 0;
  for (const item of active) {
    total += 1;
    const state = checklist[item.id];
    if (item.dynamic) {
      if (state?.channelStates && channelIds.length > 0) {
        const done = channelIds.filter((id) => state.channelStates![id]?.completed).length;
        earned += done / channelIds.length;
      }
    } else {
      if (state?.completed) earned += 1;
    }
  }
  return Math.round((earned / total) * 100);
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ready, session } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [defs, setDefs] = useState<ChecklistItemDef[]>([]);
  const [cams, setCams] = useState<CAM[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [checklist, setChecklist] = useState<Record<string, ChecklistItemState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [spLoading, setSpLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [infraError, setInfraError] = useState("");

  const loadClient = async () => {
    const [clientsData, defsData, camsData, channelsData] = await Promise.all([
      fetch(`/api/clients`).then((r) => r.json()),
      fetch("/api/checklist").then((r) => r.json()),
      fetch("/api/cams").then((r) => r.json()),
      fetch("/api/channels").then((r) => r.json()),
    ]);
    const found = (clientsData as Client[]).find((c) => c.id === id);
    setClient(found ?? null);
    setDefs((defsData as ChecklistItemDef[]).sort((a, b) => a.order - b.order));
    setCams(camsData);
    setChannels(channelsData);
    setChecklist(found?.checklist ?? {});
    return found ?? null;
  };

  useEffect(() => {
    if (!ready) return;
    loadClient().then(() => setLoading(false));
  }, [ready, id]);

  // Poll while Teams is creating
  useEffect(() => {
    if (!client || client.teamsStatus !== "creating") return;
    const interval = setInterval(async () => {
      const clientsData: Client[] = await fetch("/api/clients").then((r) => r.json());
      const found = clientsData.find((c) => c.id === id);
      if (found) {
        setClient(found);
        setChecklist(found.checklist ?? {});
        if (found.teamsStatus !== "creating") clearInterval(interval);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [client?.teamsStatus, id]);

  const handleCreateSharePoint = async () => {
    if (client?.sharepointStatus === "created") return;
    setInfraError("");
    setSpLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/sharepoint`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setInfraError(data.error ?? "SharePoint creation failed"); return; }
      await loadClient();
    } catch {
      setInfraError("Network error during SharePoint creation");
    } finally {
      setSpLoading(false);
    }
  };

  const handleCreateTeams = async () => {
    if (client?.teamsStatus === "created" || client?.teamsStatus === "creating") return;
    setInfraError("");
    setTeamsLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/teams`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setInfraError(data.error ?? "Teams creation failed"); return; }
      setClient((c) => c ? { ...c, teamsStatus: "creating" } : c);
    } catch {
      setInfraError("Network error during Teams creation");
    } finally {
      setTeamsLoading(false);
    }
  };

  const toggleItem = async (itemId: string, newCompleted: boolean) => {
    setSaving(itemId);
    const now = new Date().toISOString();
    const newState: ChecklistItemState = {
      completed: newCompleted,
      completedAt: newCompleted ? now : undefined,
      completedBy: newCompleted ? (session?.id ?? "user") : undefined,
    };
    const res = await fetch(`/api/clients/${id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, state: newState }),
    });
    const updated = await res.json();
    setChecklist(updated);
    // Also update local client checklist ref
    setClient((c) => c ? { ...c, checklist: updated } : c);
    setSaving(null);
  };

  const toggleChannelItem = async (itemId: string, channelId: string, newCompleted: boolean) => {
    setSaving(`${itemId}-${channelId}`);
    const now = new Date().toISOString();
    const currentState = checklist[itemId] ?? { completed: false, channelStates: {} };
    const currentChannelStates = currentState.channelStates ?? {};
    const newChannelStates = {
      ...currentChannelStates,
      [channelId]: { completed: newCompleted, completedAt: newCompleted ? now : undefined },
    };
    // Mark item as completed only if ALL channels done
    const allDone = client?.channelIds.every((cId) => newChannelStates[cId]?.completed);
    const newState: ChecklistItemState = {
      completed: allDone ?? false,
      channelStates: newChannelStates,
    };
    const res = await fetch(`/api/clients/${id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, state: newState }),
    });
    const updated = await res.json();
    setChecklist(updated);
    setClient((c) => c ? { ...c, checklist: updated } : c);
    setSaving(null);
  };

  if (!ready || loading) return null;
  if (!client) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-oj-muted">Client not found.</p>
        <Link href="/" className="text-oj-blue underline mt-4 block">← Back to Dashboard</Link>
      </div>
    );
  }

  const cam = cams.find((c) => c.id === client.camId);
  const clientChannels = channels.filter((ch) => client.channelIds.includes(ch.id));
  const score = computeScore(defs, checklist, client.channelIds);

  const groupedDefs = SECTIONS.map((sec) => ({
    ...sec,
    items: defs.filter((i) => i.active && i.section === sec.value),
  })).filter((sec) => sec.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-oj-muted mb-6">
        <Link href="/" className="hover:text-oj-blue">Dashboard</Link>
        <span>/</span>
        <span className="text-oj-dark font-medium">{client.name}</span>
      </div>

      {/* Client header */}
      <div className="bg-oj-white border border-oj-border rounded-xl p-6 shadow-sm mb-6 flex items-start gap-6">
        <div className="shrink-0">
          <ScoreGauge score={score} size={96} strokeWidth={9} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-oj-dark">{client.name}</h1>
              <p className="text-sm text-oj-muted mt-0.5">
                Contact: <strong className="text-oj-dark">{client.contactName}</strong>
                {cam && <> &nbsp;·&nbsp; CAM: <strong className="text-oj-dark">{cam.name} {cam.surname}</strong></>}
              </p>
              {client.website && (
                <a href={client.website} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-oj-blue hover:underline mt-0.5 inline-block">
                  {client.website}
                </a>
              )}
            </div>
            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${
              client.status === "live" ? "bg-green-100 text-green-700" :
              client.status === "active" ? "bg-blue-100 text-blue-700" :
              "bg-gray-100 text-gray-600"
            }`}>
              {client.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {clientChannels.map((ch) => (
              <span key={ch.id} className="text-xs bg-oj-blue-light text-oj-blue px-2 py-0.5 rounded-full font-medium">
                {ch.name}
              </span>
            ))}
          </div>
          <p className="text-xs text-oj-muted mt-2">Start date: {client.startDate}</p>
        </div>
      </div>

      {/* Infrastructure Setup */}
      <div className="bg-oj-white border border-oj-border rounded-xl p-5 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-oj-dark mb-3">Infrastructure Setup</h2>
        <div className="flex flex-wrap gap-3">
          {/* SharePoint */}
          {client.sharepointStatus === "created" ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <span>✓</span> SharePoint folder created
            </div>
          ) : (
            <button
              onClick={handleCreateSharePoint}
              disabled={spLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {spLoading ? (
                <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span> Creating folder…</>
              ) : (
                <>{client.sharepointStatus === "error" ? "⚠ Retry SharePoint" : "📁 Create SharePoint Folder"}</>
              )}
            </button>
          )}

          {/* Teams */}
          {client.teamsStatus === "created" ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <span>✓</span> Teams structure created
            </div>
          ) : client.teamsStatus === "creating" ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm font-medium">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full"></span>
              Creating Teams structure… (this takes ~30–60s)
            </div>
          ) : (
            <button
              onClick={handleCreateTeams}
              disabled={teamsLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {teamsLoading ? (
                <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span> Starting…</>
              ) : (
                <>{client.teamsStatus === "error" ? "⚠ Retry Teams" : "👥 Create Teams Structure"}</>
              )}
            </button>
          )}
        </div>
        {infraError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{infraError}</p>
        )}
      </div>

      {/* Onboarding progress */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-oj-dark">Onboarding Checklist</h2>
        <div className="flex items-center gap-3 text-xs text-oj-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-blue-100 border border-blue-200 inline-block"></span> manual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-200 inline-block"></span> auto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-200 inline-block"></span> either
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {groupedDefs.map((sec) => (
          <div key={sec.value} className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between">
              <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">{sec.label}</span>
              <span className="text-xs text-oj-muted">
                {sec.items.filter((item) => {
                  const s = checklist[item.id];
                  if (item.dynamic) {
                    return client.channelIds.length > 0 &&
                      client.channelIds.every((cId) => s?.channelStates?.[cId]?.completed);
                  }
                  return s?.completed;
                }).length} / {sec.items.length}
              </span>
            </div>
            <ul className="divide-y divide-oj-border">
              {sec.items.map((item) => {
                const state = checklist[item.id];
                const isAuto = item.type === "auto";
                const isChecked = item.dynamic
                  ? client.channelIds.length > 0 && client.channelIds.every((cId) => state?.channelStates?.[cId]?.completed)
                  : (state?.completed ?? false);
                const badge = TYPE_BADGE[item.type];

                return (
                  <li key={item.id} className="px-5 py-4">
                    {/* Item row */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {isAuto ? (
                          <div className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                            isChecked ? "bg-green-500 text-white" : "bg-gray-100 text-gray-400 border border-gray-200"
                          }`}>
                            {isChecked ? "✓" : "⚙"}
                          </div>
                        ) : (
                          <input
                            type="checkbox"
                            checked={!item.dynamic && isChecked}
                            disabled={item.dynamic || saving === item.id}
                            onChange={() => !item.dynamic && toggleItem(item.id, !isChecked)}
                            className="w-4 h-4 mt-0.5 accent-oj-blue cursor-pointer disabled:cursor-default"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${isChecked ? "line-through text-oj-muted" : "text-oj-dark"}`}>
                            {item.label}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
                          {item.dynamic && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200">per-channel</span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-oj-muted mt-0.5 leading-relaxed">{item.description}</p>
                        )}
                        {isChecked && state?.completedAt && !item.dynamic && (
                          <p className="text-xs text-green-600 mt-0.5">
                            ✓ {state.completedBy === "system" ? "Auto-completed" : "Completed"} ·{" "}
                            {new Date(state.completedAt).toLocaleDateString("en-ZA")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dynamic per-channel sub-items */}
                    {item.dynamic && clientChannels.length > 0 && (
                      <div className="ml-8 mt-3 grid grid-cols-2 gap-2">
                        {clientChannels.map((ch) => {
                          const chState = state?.channelStates?.[ch.id];
                          const chChecked = chState?.completed ?? false;
                          const chSaving = saving === `${item.id}-${ch.id}`;
                          return (
                            <label
                              key={ch.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none transition-colors text-sm ${
                                chChecked
                                  ? "bg-green-50 border-green-200 text-green-700"
                                  : "bg-oj-bg border-oj-border text-oj-dark hover:border-oj-blue"
                              } ${isAuto ? "cursor-default" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={chChecked}
                                disabled={isAuto || chSaving}
                                onChange={() => !isAuto && toggleChannelItem(item.id, ch.id, !chChecked)}
                                className="accent-oj-blue"
                              />
                              <span className={chChecked ? "line-through" : ""}>{ch.name}</span>
                              {chSaving && <span className="text-xs text-oj-muted ml-auto">…</span>}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
