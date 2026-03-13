"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { useRouter } from "next/navigation";
import ScoreGauge from "@/components/ScoreGauge";
import PersonnelEditModal from "@/components/PersonnelEditModal";
import PersonnelEmailModal from "@/components/PersonnelEmailModal";
import CognitoLinkModal from "@/components/CognitoLinkModal";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal";
import ControlFileSignOffModal from "@/components/ControlFileSignOffModal";

type ChecklistItemDef = {
  id: string;
  label: string;
  description?: string;
  section: string;
  type: "manual" | "auto" | "either";
  dynamic: boolean;
  order: number;
  active: boolean;
  optional?: boolean;
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
  teamsError?: string;
  teamsWarnings?: string[];
  personnelToken?: string;
  personnelSubmittedAt?: string;
  personnelSpUrl?: string;
  personnelSubmission?: PersonnelRow[];
  cognitoEntryId?: string;
  cognitoData?: Record<string, unknown>;
  cognitoLinkedAt?: string;
  xeroContactId?: string;
  xeroContactUrl?: string;
  ndaSentAt?: string;
  signOffEmailSentAt?: string;
  archived?: boolean;
  archivedAt?: string;
};

type PersonnelRow = {
  role: string; name: string; email: string; cell: string;
  channels: string[]; customFields?: Record<string, string>;
};

type CAM = { id: string; name: string; surname: string; email: string };
type Channel = {
  id: string;
  name: string;
  logoFileName?: string;
  mandateFileName?: string;
  mandateBase64?: string;
  mandateEmailSubject?: string;
  mandateEmailBody?: string;
};

const SECTIONS: { value: string; label: string }[] = [
  { value: "onboarding", label: "Onboarding" },
  { value: "legal", label: "Legal & Compliance" },
  { value: "channels", label: "Channels" },
  { value: "technical", label: "Technical Setup" },
  { value: "training", label: "Training & Handover" },
  { value: "signoff", label: "Client Sign-off" },
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
  const active = defs.filter((i) => i.active && !i.optional);
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
  const router = useRouter();

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
  const [personnelLoading, setPersonnelLoading] = useState(false);
  const [personnelCopied, setPersonnelCopied] = useState(false);
  const [editPersonnelOpen, setEditPersonnelOpen] = useState(false);
  const [cognitoModalOpen, setCognitoModalOpen] = useState(false);
  const [cognitoUnlinking, setCognitoUnlinking] = useState(false);
  const [xeroConnected, setXeroConnected] = useState<boolean | null>(null);
  const [xeroPushing, setXeroPushing] = useState(false);
  const [xeroError, setXeroError] = useState("");
  const [mandateSending, setMandateSending] = useState<Record<string, boolean>>({});
  const [mandateSent, setMandateSent] = useState<Record<string, boolean>>({});
  const [mandateSendingAll, setMandateSendingAll] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailPersonnelOpen, setEmailPersonnelOpen] = useState(false);
  const [ndaSending, setNdaSending] = useState(false);
  const [ndaSent, setNdaSent] = useState(false);
  const [ndaError, setNdaError] = useState("");
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);

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
    fetch("/api/xero/status").then((r) => r.json()).then((d) => setXeroConnected(!!d.connected));
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
      const res = await fetch(`/api/clients/${id}/sharepoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.id, userName: session ? `${session.name} ${session.surname}` : undefined }),
      });
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
      const res = await fetch(`/api/clients/${id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.id, userName: session ? `${session.name} ${session.surname}` : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setInfraError(data.error ?? "Teams creation failed"); return; }
      setClient((c) => c ? { ...c, teamsStatus: "creating" } : c);
    } catch {
      setInfraError("Network error during Teams creation");
    } finally {
      setTeamsLoading(false);
    }
  };

  const handlePersonnelToken = async () => {
    setPersonnelLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/personnel-token`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        const url = `${window.location.origin}/personnel/${data.token}`;
        await navigator.clipboard.writeText(url);
        setPersonnelCopied(true);
        setTimeout(() => setPersonnelCopied(false), 3000);
        await loadClient();
      }
    } finally {
      setPersonnelLoading(false);
    }
  };

  const copyPersonnelLink = async () => {
    if (!client) return;
    const url = `${window.location.origin}/personnel/${client.personnelToken}`;
    await navigator.clipboard.writeText(url);
    setPersonnelCopied(true);
    setTimeout(() => setPersonnelCopied(false), 3000);
  };

  const handleXeroPush = async () => {
    setXeroError("");
    setXeroPushing(true);
    try {
      const res = await fetch(`/api/clients/${id}/xero-contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.id,
          userName: session ? `${session.name} ${session.surname}` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setXeroError(data.error ?? "Failed to push to Xero"); return; }
      await loadClient();
    } catch {
      setXeroError("Network error pushing to Xero");
    } finally {
      setXeroPushing(false);
    }
  };

  const handleCognitoUnlink = async () => {
    if (!confirm("Unlink this Cognito entry? The synced data will be removed.")) return;
    setCognitoUnlinking(true);
    await fetch(`/api/clients/${id}/cognito-link`, { method: "DELETE" });
    await loadClient();
    setCognitoUnlinking(false);
  };

  const handleSendNda = async () => {
    setNdaError("");
    setNdaSending(true);
    try {
      const res = await fetch(`/api/clients/${id}/nda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session?.id, userName: session ? `${session.name} ${session.surname}` : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setNdaError(data.error ?? "Failed to send NDA"); return; }
      setNdaSent(true);
      setTimeout(() => setNdaSent(false), 4000);
      await loadClient();
    } catch {
      setNdaError("Network error sending NDA");
    } finally {
      setNdaSending(false);
    }
  };

  const handleSendMandate = async (channelId: string) => {
    setMandateSending((s) => ({ ...s, [channelId]: true }));
    try {
      await fetch(`/api/clients/${id}/mandate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          userId: session?.id,
          userName: session ? `${session.name} ${session.surname}` : undefined,
        }),
      });
      setMandateSent((s) => ({ ...s, [channelId]: true }));
      setTimeout(() => setMandateSent((s) => ({ ...s, [channelId]: false })), 4000);
    } finally {
      setMandateSending((s) => ({ ...s, [channelId]: false }));
    }
  };

  const handleSendAllMandates = async () => {
    const mandateChannels = clientChannels.filter((ch) => ch.mandateBase64 && ch.mandateEmailSubject);
    if (mandateChannels.length === 0) return;
    setMandateSendingAll(true);
    for (const ch of mandateChannels) {
      await handleSendMandate(ch.id);
    }
    setMandateSendingAll(false);
  };

  const handleArchiveClient = async () => {
    if (!client) return;
    setDangerLoading(true);
    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: true, archivedAt: new Date().toISOString() }),
    });
    setDangerLoading(false);
    router.push("/");
  };

  const handleRestoreClient = async () => {
    if (!client) return;
    setDangerLoading(true);
    await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false, archivedAt: null }),
    });
    await loadClient();
    setDangerLoading(false);
  };

  const handleDeleteClient = async () => {
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    setShowDeleteModal(false);
    router.push("/");
  };

  const toggleItem = async (itemId: string, newCompleted: boolean) => {
    setSaving(itemId);
    const now = new Date().toISOString();
    const newState: ChecklistItemState = {
      completed: newCompleted,
      completedAt: newCompleted ? now : undefined,
      completedBy: newCompleted ? (session?.id ?? "user") : undefined,
    };
    const itemDef = defs.find((d) => d.id === itemId);
    const res = await fetch(`/api/clients/${id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        state: newState,
        userId: session?.id,
        userName: session ? `${session.name} ${session.surname}` : undefined,
        itemLabel: itemDef?.label,
      }),
    });
    const updated = await res.json();
    setChecklist(updated);
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
    const allDone = client?.channelIds.every((cId) => newChannelStates[cId]?.completed);
    const newState: ChecklistItemState = {
      completed: allDone ?? false,
      channelStates: newChannelStates,
    };
    const itemDef = defs.find((d) => d.id === itemId);
    const channelName = channels.find((ch) => ch.id === channelId)?.name ?? channelId;
    const res = await fetch(`/api/clients/${id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        state: newState,
        userId: session?.id,
        userName: session ? `${session.name} ${session.surname}` : undefined,
        itemLabel: itemDef ? `${itemDef.label} — ${channelName}` : channelName,
      }),
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
          <div className="flex flex-wrap gap-2 mt-3 items-center">
            {clientChannels.map((ch) => (
              ch.logoFileName ? (
                <div key={ch.id} title={ch.name} className="h-7 px-2 flex items-center justify-center bg-white border border-oj-border rounded-lg shadow-sm">
                  <img
                    src={`/channel-logos/${ch.logoFileName}`}
                    alt={ch.name}
                    className="h-5 w-auto max-w-[60px] object-contain"
                  />
                </div>
              ) : (
                <span key={ch.id} className="text-xs bg-oj-blue-light text-oj-blue px-2 py-0.5 rounded-full font-medium">
                  {ch.name}
                </span>
              )
            ))}
          </div>
          <p className="text-xs text-oj-muted mt-2">Start date: {client.startDate}</p>
        </div>
      </div>

      {/* Channels & Mandates */}
      {clientChannels.length > 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Channels &amp; Mandate Letters</span>
            {clientChannels.some((ch) => ch.mandateBase64 && ch.mandateEmailSubject) && (
              <button
                onClick={handleSendAllMandates}
                disabled={mandateSendingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-blue text-white text-xs font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60"
              >
                {mandateSendingAll ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span> Sending all…</>
                ) : (
                  <>✉ Send All Mandates</>
                )}
              </button>
            )}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-oj-border">
                <th className="text-left px-5 py-2.5 text-xs font-bold text-oj-muted uppercase tracking-wide">Channel</th>
                <th className="text-left px-5 py-2.5 text-xs font-bold text-oj-muted uppercase tracking-wide">Mandate Status</th>
                <th className="px-5 py-2.5 w-36" />
              </tr>
            </thead>
            <tbody>
              {clientChannels.map((ch, i) => {
                const hasMandate = !!(ch.mandateBase64 && ch.mandateEmailSubject);
                const isSending = mandateSending[ch.id];
                const isSent = mandateSent[ch.id];
                return (
                  <tr key={ch.id} className={`border-b border-oj-border last:border-0 ${i % 2 === 1 ? "bg-oj-bg/40" : ""}`}>
                    <td className="px-5 py-3 font-medium text-oj-dark">{ch.name}</td>
                    <td className="px-5 py-3">
                      {hasMandate ? (
                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-medium">
                          ✓ Mandate ready
                        </span>
                      ) : (
                        <span className="text-xs text-oj-muted">No mandate set</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {hasMandate && (
                        isSent ? (
                          <span className="text-xs font-semibold text-green-600">✓ Sent</span>
                        ) : (
                          <button
                            onClick={() => handleSendMandate(ch.id)}
                            disabled={isSending || mandateSendingAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors disabled:opacity-60 ml-auto"
                          >
                            {isSending ? (
                              <><span className="animate-spin inline-block w-3 h-3 border-2 border-oj-blue border-t-transparent rounded-full"></span> Sending…</>
                            ) : (
                              <>✉ Send Mandate</>
                            )}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
          <div className="flex flex-col gap-2">
            {client.teamsStatus === "created" ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                  <span>✓</span> Teams structure created
                </div>
                {client.teamsWarnings && client.teamsWarnings.length > 0 && (
                  <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-sm space-y-1">
                    <p className="font-semibold text-amber-700">Some steps had warnings:</p>
                    {client.teamsWarnings.map((w, i) => (
                      <p key={i} className="text-amber-700 break-words">{w}</p>
                    ))}
                  </div>
                )}
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
            {client.teamsStatus === "error" && client.teamsError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-sm break-words">
                <strong>Teams error:</strong> {client.teamsError}
              </p>
            )}
          </div>
          {/* Personnel Form */}
          <div className="flex flex-col gap-2">
            {client.personnelSubmittedAt ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                  <span>✓</span> Personnel submitted {new Date(client.personnelSubmittedAt).toLocaleDateString("en-ZA")}
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditPersonnelOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-blue text-white text-xs font-semibold hover:bg-oj-blue-hover transition-colors"
                    >
                      ✏ Edit Personnel Form
                    </button>
                    <div className="relative group">
                      <span className="cursor-help text-oj-muted hover:text-oj-blue text-xs font-bold select-none px-1">ⓘ</span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 bg-oj-dark text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg z-20 text-center leading-relaxed">
                        Changes you make here will update the personnel file in SharePoint automatically.
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-oj-dark" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setEmailPersonnelOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
                  >
                    ✉ Email Personnel Form
                  </button>
                  <button
                    onClick={copyPersonnelLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
                  >
                    {personnelCopied ? "✓ Copied!" : "📋 Copy Form Link"}
                  </button>
                  {client.personnelSpUrl && (
                    <a
                      href={client.personnelSpUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-blue text-xs font-medium hover:border-oj-blue transition-colors"
                    >
                      View in SharePoint →
                    </a>
                  )}
                </div>
              </div>
            ) : client.personnelToken ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
                  <span>⏳</span> Awaiting personnel submission
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={copyPersonnelLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
                  >
                    {personnelCopied ? "✓ Copied!" : "📋 Copy Form Link"}
                  </button>
                  <a
                    href={`/personnel/${client.personnelToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-blue text-xs font-medium hover:border-oj-blue transition-colors"
                  >
                    Open Form →
                  </a>
                  <button
                    onClick={() => setEmailPersonnelOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
                  >
                    ✉ Email Personnel Form
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handlePersonnelToken}
                disabled={personnelLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {personnelLoading ? (
                  <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span> Generating…</>
                ) : (
                  <>👤 Generate &amp; Copy Form Link</>
                )}
              </button>
            )}
          </div>
        </div>
        {infraError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{infraError}</p>
        )}
      </div>

      {/* Cognito Data */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Cognito Billing Data</span>
            {client.cognitoLinkedAt && (
              <span className="ml-2 text-xs text-oj-muted">
                · linked {new Date(client.cognitoLinkedAt).toLocaleDateString("en-ZA")}
              </span>
            )}
          </div>
          {client.cognitoData ? (
            <div className="flex gap-2">
              <button
                onClick={() => setCognitoModalOpen(true)}
                className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover transition-colors"
              >
                Re-link
              </button>
              <button
                onClick={handleCognitoUnlink}
                disabled={cognitoUnlinking}
                className="text-xs font-semibold text-oj-orange hover:text-oj-orange-hover transition-colors disabled:opacity-50"
              >
                {cognitoUnlinking ? "Unlinking…" : "Unlink"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setCognitoModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-blue text-white text-xs font-semibold hover:bg-oj-blue-hover transition-colors"
            >
              + Link Cognito Entry
            </button>
          )}
        </div>

        {client.cognitoData ? (
          <CognitoDataDisplay data={client.cognitoData} />
        ) : (
          <div className="px-5 py-6 text-sm text-oj-muted">
            No Cognito entry linked yet. Click <strong>+ Link Cognito Entry</strong> to search and match the client's billing submission.
          </div>
        )}
      </div>

      {/* Xero Contact */}
      {client.cognitoData && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm mb-6 overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Xero Contact</span>
            {client.xeroContactId && (
              <a
                href={client.xeroContactUrl ?? `https://go.xero.com/Contacts/View/${client.xeroContactId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-oj-blue hover:underline font-medium"
              >
                View in Xero →
              </a>
            )}
          </div>
          <div className="px-5 py-4">
            {client.xeroContactId ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg font-medium">
                  <span>✓</span> Contact exists in Xero
                </div>
                <button
                  onClick={handleXeroPush}
                  disabled={xeroPushing}
                  className="px-3 py-2 text-xs font-medium text-oj-muted border border-oj-border rounded-lg hover:border-oj-blue transition-colors disabled:opacity-50"
                >
                  {xeroPushing ? "Updating…" : "↻ Sync to Xero"}
                </button>
              </div>
            ) : xeroConnected === false ? (
              <div className="flex items-center gap-2 text-sm text-oj-muted">
                <span>Xero not connected —</span>
                <a href="/admin/xero" className="text-oj-blue hover:underline font-medium">Connect in Admin →</a>
              </div>
            ) : (
              <button
                onClick={handleXeroPush}
                disabled={xeroPushing || xeroConnected === null}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00B4D8] text-white text-sm font-semibold hover:bg-[#0096B4] transition-colors disabled:opacity-60"
              >
                {xeroPushing ? (
                  <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Creating contact…</>
                ) : (
                  <>Create Xero Contact</>
                )}
              </button>
            )}
            {xeroError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{xeroError}</p>
            )}
          </div>
        </div>
      )}

      {/* Legal Documents */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Legal Documents</span>
          <button
            onClick={() => setSignOffModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
          >
            ✉ Send Control File Sign-off
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            {/* NDA */}
            <div className="flex flex-col gap-1.5">
              {client.ndaSentAt ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                  <span>✓</span> NDA sent {new Date(client.ndaSentAt).toLocaleDateString("en-ZA")}
                </div>
              ) : null}
              {client.cognitoData ? (
                ndaSent ? (
                  <span className="text-xs font-semibold text-green-600 px-3 py-2">✓ NDA sent!</span>
                ) : (
                  <button
                    onClick={handleSendNda}
                    disabled={ndaSending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60"
                  >
                    {ndaSending ? (
                      <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Sending NDA…</>
                    ) : (
                      <>{client.ndaSentAt ? "↻ Re-send NDA" : "📄 Send NDA"}</>
                    )}
                  </button>
                )
              ) : (
                <div className="text-sm text-oj-muted px-1">
                  Link Cognito data first to enable NDA sending.
                </div>
              )}
              {ndaError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 max-w-sm">{ndaError}</p>
              )}
            </div>
          </div>
        </div>
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
                          {item.optional && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">optional</span>
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

      {/* Danger Zone */}
      <div className="mt-8 border border-red-200 rounded-xl p-6 bg-red-50/30">
        <h2 className="text-sm font-bold text-red-700 mb-1">Danger Zone</h2>
        <p className="text-xs text-red-500 mb-4">These actions are irreversible or have significant impact.</p>
        <div className="flex flex-wrap gap-3">
          {client.archived ? (
            <button
              onClick={handleRestoreClient}
              disabled={dangerLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-oj-border bg-white text-sm font-semibold text-oj-dark hover:border-oj-blue transition-colors disabled:opacity-50"
            >
              {dangerLoading ? (
                <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-oj-dark border-t-transparent rounded-full" /> Restoring…</>
              ) : (
                "Restore Client"
              )}
            </button>
          ) : (
            <button
              onClick={handleArchiveClient}
              disabled={dangerLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 bg-white text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {dangerLoading ? (
                <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full" /> Archiving…</>
              ) : (
                "Archive Client"
              )}
            </button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400 bg-white text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors"
          >
            Delete Client
          </button>
        </div>
        {client.archived && client.archivedAt && (
          <p className="mt-3 text-xs text-red-400">
            Archived {new Date(client.archivedAt).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        )}
      </div>

      {showDeleteModal && (
        <ConfirmDeleteModal
          clientName={client.name}
          onConfirm={handleDeleteClient}
          onClose={() => setShowDeleteModal(false)}
        />
      )}

      {editPersonnelOpen && (
        <PersonnelEditModal
          clientId={id}
          clientName={client.name}
          initialRows={client.personnelSubmission ?? []}
          channels={clientChannels}
          onClose={() => setEditPersonnelOpen(false)}
          onSaved={async () => {
            setEditPersonnelOpen(false);
            await loadClient();
          }}
        />
      )}

      {emailPersonnelOpen && client.personnelToken && (
        <PersonnelEmailModal
          clientId={id}
          clientName={client.name}
          contactName={client.contactName}
          camName={cam ? `${cam.name} ${cam.surname}` : ""}
          camEmail={cam?.email ?? ""}
          personnelToken={client.personnelToken}
          clientEmails={client.emails ?? []}
          onClose={() => setEmailPersonnelOpen(false)}
        />
      )}

      {cognitoModalOpen && (
        <CognitoLinkModal
          clientId={id}
          session={session}
          onLinked={async () => {
            setCognitoModalOpen(false);
            await loadClient();
          }}
          onClose={() => setCognitoModalOpen(false)}
        />
      )}

      {signOffModalOpen && (
        <ControlFileSignOffModal
          clientId={id}
          clientName={client.name}
          camName={cam ? `${cam.name} ${cam.surname}` : ""}
          camEmail={cam?.email ?? ""}
          personnelRows={(client.personnelSubmission ?? []).map((r) => ({ name: r.name, email: r.email, channels: r.channels }))}
          clientEmails={client.emails ?? []}
          session={session}
          onClose={() => setSignOffModalOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cognito data display — structured sections for company, address, contacts
// ---------------------------------------------------------------------------

const SKIP_KEYS = new Set([
  "Id", "InternalId", "FormId", "Form", "Organization",
  "Entry", "EntryId", "Status", "AdminStatus",
  "DateCreated", "DateUpdated", "DateSubmitted",
  "Revision", "ContentType", "ExternalId",
]);

const STRUCTURED_KEYS = new Set([
  "CompanyName", "TradingAs", "CompanyRegistrationNumber", "VATNumber2",
  "Email", "Phone", "Website", "Address",
  "BillingContactPerson", "ContractContactPerson",
]);

function getDisplayLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

function formatAddress(addr: unknown): string {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    const a = addr as Record<string, string>;
    return [a.Line1, a.Line2, a.City, a.Region, a.PostalCode].filter(Boolean).join(", ");
  }
  return String(addr);
}

function formatContact(val: unknown): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    const c = val as Record<string, string>;
    const name = [c.FirstName, c.LastName].filter(Boolean).join(" ");
    return [name, c.EmailAddress].filter(Boolean).join(" — ");
  }
  return String(val);
}

function CognitoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-oj-muted mb-0.5">{label}</p>
      <p className="text-sm text-oj-dark break-words">{value}</p>
    </div>
  );
}

function CognitoDataDisplay({ data }: { data: Record<string, unknown> }) {
  const s = (key: string) => {
    const v = data[key];
    if (!v) return "";
    if (typeof v === "string") return v;
    return String(v);
  };

  const companyName = s("CompanyName");
  const tradingAs = s("TradingAs");
  const regNo = s("CompanyRegistrationNumber");
  const vatNo = s("VATNumber2");
  const email = s("Email");
  const phone = s("Phone");
  const website = s("Website");
  const address = formatAddress(data["Address"]);
  const billingContact = formatContact(data["BillingContactPerson"]);
  const contractContact = formatContact(data["ContractContactPerson"]);

  const extraFields = Object.entries(data).filter(
    ([k, v]) => !SKIP_KEYS.has(k) && !STRUCTURED_KEYS.has(k) && v !== null && v !== undefined && v !== ""
  );

  const hasCompany = companyName || tradingAs || regNo || vatNo || email || phone || website;
  const hasContacts = billingContact || contractContact;

  if (!hasCompany && !address && !hasContacts && extraFields.length === 0) {
    return <div className="px-5 py-4 text-sm text-oj-muted">No displayable fields in this entry.</div>;
  }

  return (
    <div className="divide-y divide-oj-border">
      {/* Company Details */}
      {hasCompany && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-3">Company Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {companyName && <CognitoField label="Company Name" value={companyName} />}
            {tradingAs && <CognitoField label="Trading As" value={tradingAs} />}
            {regNo && <CognitoField label="Registration Number" value={regNo} />}
            {vatNo && <CognitoField label="VAT Number" value={vatNo} />}
            {email && <CognitoField label="Email" value={email} />}
            {phone && <CognitoField label="Phone" value={phone} />}
            {website && <CognitoField label="Website" value={website} />}
          </div>
        </div>
      )}

      {/* Address */}
      {address && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-2">Physical Address</p>
          <p className="text-sm text-oj-dark">{address}</p>
        </div>
      )}

      {/* Contact Persons */}
      {hasContacts && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-3">Contact Persons</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {billingContact && <CognitoField label="Billing Contact" value={billingContact} />}
            {contractContact && <CognitoField label="Contract Contact" value={contractContact} />}
          </div>
        </div>
      )}

      {/* Additional data — any remaining Cognito fields */}
      {extraFields.length > 0 && (
        <div className="px-5 py-4">
          <p className="text-xs font-bold text-oj-muted uppercase tracking-wide mb-3">Additional Data</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {extraFields.map(([k, v]) => (
              <CognitoField
                key={k}
                label={getDisplayLabel(k)}
                value={typeof v === "object" ? JSON.stringify(v) : String(v)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
