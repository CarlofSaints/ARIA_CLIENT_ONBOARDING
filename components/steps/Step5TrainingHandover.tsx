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
  onToggleItem: (id: string, val: boolean) => void;
  onToggleChannelItem: (id: string, channelId: string, val: boolean) => void;
};

export default function Step5TrainingHandover({
  client,
  channels,
  checklist,
  defs,
  isAdmin,
  saving,
  onToggleItem,
  onToggleChannelItem,
}: Props) {
  const clientChannels = channels.filter((ch) => client.channelIds.includes(ch.id));
  const stepDefs = defs.filter((d) => d.active && (d.step ?? 1) === 5);

  const allDone = stepDefs.length > 0 && stepDefs.every((item) => {
    const s = checklist[item.id];
    if (item.dynamic) return client.channelIds.length > 0 && client.channelIds.every((cId) => s?.channelStates?.[cId]?.completed);
    return s?.completed;
  });

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      {allDone ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-lg font-bold shrink-0">✓</div>
          <div>
            <p className="font-bold text-green-800 text-sm">Onboarding complete!</p>
            <p className="text-xs text-green-700 mt-0.5">All training and sign-off items have been completed for {client.name}.</p>
          </div>
        </div>
      ) : (
        <div className="bg-oj-white border border-oj-border rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-bold text-oj-dark mb-1">Training &amp; Sign-off</h2>
          <p className="text-xs text-oj-muted">
            Complete training sessions with the client and confirm sign-off on all control files.
            This is the final step before the client goes live.
          </p>
        </div>
      )}

      {/* Step 5 Checklist */}
      {stepDefs.length > 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Training &amp; Sign-off — Checklist</span>
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
