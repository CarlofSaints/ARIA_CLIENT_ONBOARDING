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
  onSignOffOpen: () => void;
  onToggleItem: (id: string, val: boolean) => void;
  onToggleChannelItem: (id: string, channelId: string, val: boolean) => void;
};

export default function Step4ControlFiles({
  client,
  channels,
  checklist,
  defs,
  isAdmin,
  saving,
  onSignOffOpen,
  onToggleItem,
  onToggleChannelItem,
}: Props) {
  const clientChannels = channels.filter((ch) => client.channelIds.includes(ch.id));
  const stepDefs = defs.filter((d) => d.active && (d.step ?? 1) === 4);

  return (
    <div className="space-y-6">
      {/* Sign-off Email */}
      <div className="bg-oj-white border border-oj-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-oj-dark">Control File Sign-off</h2>
            <p className="text-xs text-oj-muted mt-0.5">
              Send the control file sign-off email to the client to confirm all files are correct.
            </p>
            {client.signOffEmailSentAt && (
              <p className="text-xs text-green-600 mt-1">
                ✓ Sign-off email sent {new Date(client.signOffEmailSentAt).toLocaleDateString("en-ZA")}
              </p>
            )}
          </div>
          <button
            onClick={onSignOffOpen}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors"
          >
            ✉ Send Sign-off Email
          </button>
        </div>
      </div>

      {/* Step 4 Checklist */}
      {stepDefs.length > 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Control Files — Checklist</span>
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
