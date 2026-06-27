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
import StepProgressBar, { STEP_LABELS } from "@/components/StepProgressBar";
import Step1AccountSetup from "@/components/steps/Step1AccountSetup";
import Step2ClientKickoff from "@/components/steps/Step2ClientKickoff";
import Step3Infrastructure from "@/components/steps/Step3Infrastructure";
import Step4ControlFiles from "@/components/steps/Step4ControlFiles";
import Step5TrainingHandover from "@/components/steps/Step5TrainingHandover";
import type {
  ChecklistItemDef,
  ChecklistItemState,
  Client,
  Channel,
  PersonnelRow,
  Session,
} from "@/components/steps/types";

type CAM = { id: string; name: string; surname: string; email: string };

const STEP_COUNT = 5;

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
  const [currentStep, setCurrentStep] = useState(1);

  const [spLoading, setSpLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [dropboxLoading, setDropboxLoading] = useState(false);
  const [infraError, setInfraError] = useState("");
  const [infraSuccess, setInfraSuccess] = useState("");
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
  const [skipWarning, setSkipWarning] = useState<{ targetStep: number; incompleteSteps: string[] } | null>(null);

  // Derive isAdmin from the session's role. The login flow stores roleId/roleName
  // (see lib/useAuth.ts + app/api/auth/route.ts) — NOT a `permissions` array or a
  // `role` string, so the old check was always false for everyone.
  const typedSession = session as Session;
  const isAdmin = !!(
    typedSession?.roleName?.toLowerCase().includes("admin") ||
    typedSession?.roleId === "role-site-admin" ||
    typedSession?.roleId === "role-developer" ||
    // legacy fallbacks, in case an older session shape is ever present
    typedSession?.permissions?.includes("manage_clients") ||
    typedSession?.role?.toLowerCase().includes("admin")
  );

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

  // Check which steps before `targetStep` are incomplete
  function getIncompleteStepsBefore(targetStep: number): string[] {
    if (!client) return [];
    const incomplete: string[] = [];
    for (let s = 1; s < targetStep; s++) {
      const stepDefs = defs.filter(
        (d) => d.active && !d.optional && (d.step ?? 1) === s
      );
      if (stepDefs.length === 0) continue;
      const allDone = stepDefs.every((def) => {
        const state = checklist[def.id];
        if (def.dynamic) {
          if (!state?.channelStates || client.channelIds.length === 0) return client.channelIds.length === 0;
          return client.channelIds.every((cId) => state.channelStates![cId]?.completed);
        }
        return state?.completed;
      });
      if (!allDone) incomplete.push(STEP_LABELS[s - 1]);
    }
    return incomplete;
  }

  // Navigate to a step, showing a warning if skipping ahead past incomplete steps
  function navigateToStep(targetStep: number) {
    // Going backwards or staying — always allow without warning
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    const incomplete = getIncompleteStepsBefore(targetStep);
    if (incomplete.length > 0) {
      setSkipWarning({ targetStep, incompleteSteps: incomplete });
    } else {
      setCurrentStep(targetStep);
    }
  }

  // Confirm skip: log it and navigate
  async function confirmSkip() {
    if (!skipWarning || !client) return;
    const { targetStep, incompleteSteps } = skipWarning;
    // Log the out-of-order navigation
    fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "step.skipped",
        clientId: client.id,
        clientName: client.name,
        userId: typedSession?.id,
        userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined,
        details: `Skipped to Step ${targetStep} (${STEP_LABELS[targetStep - 1]}) with prior steps incomplete: ${incompleteSteps.join(", ")}.`,
      }),
    });
    setCurrentStep(targetStep);
    setSkipWarning(null);
  }

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
        if (found.teamsStatus === "created") {
          setInfraSuccess("Teams structure created successfully.");
          setTimeout(() => setInfraSuccess(""), 5000);
        }
        if (found.teamsStatus !== "creating") clearInterval(interval);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [client?.teamsStatus, id]);

  const handleCreateSharePoint = async () => {
    if (client?.sharepointStatus === "created") return;
    setInfraError(""); setInfraSuccess("");
    setSpLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/sharepoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: typedSession?.id, userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setInfraError(data.error ?? "SharePoint creation failed"); return; }
      await loadClient();
      setInfraSuccess("SharePoint folder created successfully.");
      setTimeout(() => setInfraSuccess(""), 5000);
    } catch {
      setInfraError("Network error during SharePoint creation");
    } finally {
      setSpLoading(false);
    }
  };

  const handleCreateTeams = async () => {
    if (client?.teamsStatus === "created" || client?.teamsStatus === "creating") return;
    setInfraError(""); setInfraSuccess("");
    setTeamsLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: typedSession?.id, userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined }),
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

  const handleCreateDropbox = async () => {
    if (client?.dropboxStatus === "created") return;
    setInfraError(""); setInfraSuccess("");
    setDropboxLoading(true);
    try {
      const res = await fetch(`/api/clients/${id}/dropbox`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: typedSession?.id, userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setInfraError(data.error ?? "Dropbox creation failed"); return; }
      await loadClient();
      setInfraSuccess("Dropbox folder created successfully.");
      setTimeout(() => setInfraSuccess(""), 5000);
    } catch {
      setInfraError("Network error during Dropbox creation");
    } finally {
      setDropboxLoading(false);
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
          userId: typedSession?.id,
          userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined,
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
        body: JSON.stringify({ userId: typedSession?.id, userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined }),
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
          userId: typedSession?.id,
          userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined,
        }),
      });
      setMandateSent((s) => ({ ...s, [channelId]: true }));
      setTimeout(() => setMandateSent((s) => ({ ...s, [channelId]: false })), 4000);
    } finally {
      setMandateSending((s) => ({ ...s, [channelId]: false }));
    }
  };

  const handleSendAllMandates = async () => {
    const clientChannels = channels.filter((ch) => client?.channelIds.includes(ch.id));
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
      completedBy: newCompleted ? (typedSession?.id ?? "user") : undefined,
    };
    const itemDef = defs.find((d) => d.id === itemId);
    const res = await fetch(`/api/clients/${id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        state: newState,
        userId: typedSession?.id,
        userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined,
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
        userId: typedSession?.id,
        userName: typedSession ? `${typedSession.name} ${typedSession.surname}` : undefined,
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

  // Common props for all step components
  const commonProps = {
    client,
    channels,
    checklist,
    defs,
    isAdmin,
    session: typedSession,
    saving,
    onToggleItem: toggleItem,
    onToggleChannelItem: toggleChannelItem,
  };

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
                  <img src={`/channel-logos/${ch.logoFileName}`} alt={ch.name} className="h-5 w-auto max-w-[60px] object-contain" />
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

      {/* Step Progress Bar */}
      <StepProgressBar
        currentStep={currentStep}
        defs={defs}
        checklist={checklist}
        channelIds={client.channelIds}
        onStepClick={navigateToStep}
      />

      {/* Step content */}
      {currentStep === 1 && (
        <Step1AccountSetup
          {...commonProps}
          cognitoUnlinking={cognitoUnlinking}
          xeroConnected={xeroConnected}
          xeroPushing={xeroPushing}
          xeroError={xeroError}
          ndaSending={ndaSending}
          ndaSent={ndaSent}
          ndaError={ndaError}
          onCognitoOpen={() => setCognitoModalOpen(true)}
          onCognitoUnlink={handleCognitoUnlink}
          onXeroPush={handleXeroPush}
          onSendNda={handleSendNda}
          onSignOffOpen={() => setSignOffModalOpen(true)}
        />
      )}

      {currentStep === 2 && (
        <Step2ClientKickoff
          {...commonProps}
          personnelLoading={personnelLoading}
          personnelCopied={personnelCopied}
          mandateSending={mandateSending}
          mandateSent={mandateSent}
          mandateSendingAll={mandateSendingAll}
          onPersonnelToken={handlePersonnelToken}
          onCopyPersonnelLink={copyPersonnelLink}
          onPersonnelEdit={() => setEditPersonnelOpen(true)}
          onPersonnelEmail={() => setEmailPersonnelOpen(true)}
          onSendMandate={handleSendMandate}
          onSendAllMandates={handleSendAllMandates}
        />
      )}

      {currentStep === 3 && (
        <Step3Infrastructure
          {...commonProps}
          spLoading={spLoading}
          teamsLoading={teamsLoading}
          dropboxLoading={dropboxLoading}
          infraError={infraError}
          infraSuccess={infraSuccess}
          onCreateSharePoint={handleCreateSharePoint}
          onCreateTeams={handleCreateTeams}
          onCreateDropbox={handleCreateDropbox}
        />
      )}

      {currentStep === 4 && (
        <Step4ControlFiles
          {...commonProps}
          onSignOffOpen={() => setSignOffModalOpen(true)}
        />
      )}

      {currentStep === 5 && (
        <Step5TrainingHandover {...commonProps} />
      )}

      {/* Step navigation */}
      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          {currentStep > 1 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-oj-border bg-oj-white text-oj-dark text-sm font-semibold hover:border-oj-blue transition-colors"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {currentStep < STEP_COUNT && (
            <button
              onClick={() => navigateToStep(currentStep + 1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-teal-600 text-white hover:bg-teal-700"
            >
              Next Step →
            </button>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-10 border border-red-200 rounded-xl p-6 bg-red-50/30">
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

      {/* Modals */}
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
          initialRows={(client.personnelSubmission ?? []) as PersonnelRow[]}
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

      {/* Skip-step warning modal */}
      {skipWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-lg shrink-0">
                !
              </div>
              <h3 className="text-lg font-bold text-oj-dark">Skipping Ahead</h3>
            </div>
            <p className="text-sm text-oj-muted mb-3">
              You&apos;re navigating to <strong className="text-oj-dark">Step {skipWarning.targetStep} ({STEP_LABELS[skipWarning.targetStep - 1]})</strong> but
              the following prior steps still have outstanding items:
            </p>
            <ul className="mb-4 space-y-1">
              {skipWarning.incompleteSteps.map((name) => (
                <li key={name} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                  <span className="text-amber-500">&#x25CF;</span> {name}
                </li>
              ))}
            </ul>
            <p className="text-xs text-oj-muted mb-5">
              This will be recorded in the activity log. You can return to complete these steps at any time.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSkipWarning(null)}
                className="px-4 py-2 rounded-lg border border-oj-border text-sm font-semibold text-oj-dark hover:bg-oj-bg transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={confirmSkip}
                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors"
              >
                Continue Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
