"use client";

import ChecklistSection from "@/components/ChecklistSection";
import type { Client, Channel, ChecklistItemDef, ChecklistItemState, Session } from "./types";

type Props = {
  client: Client;
  channels: Channel[];
  checklist: Record<string, ChecklistItemState>;
  defs: ChecklistItemDef[];
  isAdmin: boolean;
  session: Session;
  saving: string | null;
  spLoading: boolean;
  teamsLoading: boolean;
  infraError: string;
  onCreateSharePoint: () => void;
  onCreateTeams: () => void;
  onToggleItem: (id: string, val: boolean) => void;
  onToggleChannelItem: (id: string, channelId: string, val: boolean) => void;
};

export default function Step3Infrastructure({
  client,
  channels,
  checklist,
  defs,
  isAdmin,
  saving,
  spLoading,
  teamsLoading,
  infraError,
  onCreateSharePoint,
  onCreateTeams,
  onToggleItem,
  onToggleChannelItem,
}: Props) {
  const clientChannels = channels.filter((ch) => client.channelIds.includes(ch.id));
  const stepDefs = defs.filter((d) => d.active && (d.step ?? 1) === 3);

  return (
    <div className="space-y-6">
      {/* Infrastructure Setup */}
      <div className="bg-oj-white border border-oj-border rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-oj-dark mb-3">Infrastructure Setup</h2>
        <div className="flex flex-wrap gap-3">
          {/* SharePoint */}
          {client.sharepointStatus === "created" ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
              <span>✓</span> SharePoint folder created
            </div>
          ) : (
            <button
              onClick={onCreateSharePoint}
              disabled={spLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {spLoading ? (
                <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Creating folder…</>
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
                <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full" />
                Creating Teams structure… (this takes ~30–60s)
              </div>
            ) : (
              <button
                onClick={onCreateTeams}
                disabled={teamsLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {teamsLoading ? (
                  <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Starting…</>
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
        </div>
        {infraError && (
          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{infraError}</p>
        )}
      </div>

      {/* Step 3 Checklist */}
      {stepDefs.length > 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Infrastructure — Checklist</span>
            <span className="text-xs text-oj-muted">
              {stepDefs.filter((item) => {
                const s = checklist[item.id];
                if (item.dynamic) return client.channelIds.length > 0 && client.channelIds.every((cId) => s?.channelStates?.[cId]?.completed);
                return s?.completed;
              }).length} / {stepDefs.length}
            </span>
          </div>
          <ChecklistSection
            items={stepDefs}
            clientChannels={clientChannels}
            channelIds={client.channelIds}
            checklist={checklist}
            saving={saving}
            isAdmin={isAdmin}
            onToggleItem={onToggleItem}
            onToggleChannelItem={onToggleChannelItem}
          />
        </div>
      )}
    </div>
  );
}
