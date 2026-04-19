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
  personnelLoading: boolean;
  personnelCopied: boolean;
  mandateSending: Record<string, boolean>;
  mandateSent: Record<string, boolean>;
  mandateSendingAll: boolean;
  onPersonnelToken: () => void;
  onCopyPersonnelLink: () => void;
  onPersonnelEdit: () => void;
  onPersonnelEmail: () => void;
  onSendMandate: (channelId: string) => void;
  onSendAllMandates: () => void;
  onToggleItem: (id: string, val: boolean) => void;
  onToggleChannelItem: (id: string, channelId: string, val: boolean) => void;
};

export default function Step2ClientKickoff({
  client,
  channels,
  checklist,
  defs,
  isAdmin,
  saving,
  personnelLoading,
  personnelCopied,
  mandateSending,
  mandateSent,
  mandateSendingAll,
  onPersonnelToken,
  onCopyPersonnelLink,
  onPersonnelEdit,
  onPersonnelEmail,
  onSendMandate,
  onSendAllMandates,
  onToggleItem,
  onToggleChannelItem,
}: Props) {
  const clientChannels = channels.filter((ch) => client.channelIds.includes(ch.id));
  const stepDefs = defs.filter((d) => d.active && (d.step ?? 1) === 2);

  return (
    <div className="space-y-6">
      {/* Personnel Form */}
      <div className="bg-oj-white border border-oj-border rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-bold text-oj-dark mb-3">Personnel Collection Form</h2>
        {client.personnelSubmittedAt ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm font-medium w-fit">
              <span>✓</span> Personnel submitted {new Date(client.personnelSubmittedAt).toLocaleDateString("en-ZA")}
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              <div className="flex items-center gap-1">
                <button
                  onClick={onPersonnelEdit}
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
                onClick={onPersonnelEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
              >
                ✉ Email Personnel Form
              </button>
              <button
                onClick={onCopyPersonnelLink}
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
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium w-fit">
              <span>⏳</span> Awaiting personnel submission
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              <button
                onClick={onCopyPersonnelLink}
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
                onClick={onPersonnelEmail}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
              >
                ✉ Email Personnel Form
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onPersonnelToken}
            disabled={personnelLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-oj-blue text-white text-sm font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {personnelLoading ? (
              <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Generating…</>
            ) : (
              <>👤 Generate &amp; Copy Form Link</>
            )}
          </button>
        )}
      </div>

      {/* Channel Mandates */}
      {clientChannels.length > 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Channels &amp; Mandate Letters</span>
            {clientChannels.some((ch) => ch.mandateBase64 && ch.mandateEmailSubject) && (
              <button
                onClick={onSendAllMandates}
                disabled={mandateSendingAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-blue text-white text-xs font-semibold hover:bg-oj-blue-hover transition-colors disabled:opacity-60"
              >
                {mandateSendingAll ? (
                  <><span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> Sending all…</>
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
                            onClick={() => onSendMandate(ch.id)}
                            disabled={isSending || mandateSendingAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors disabled:opacity-60 ml-auto"
                          >
                            {isSending ? (
                              <><span className="animate-spin inline-block w-3 h-3 border-2 border-oj-blue border-t-transparent rounded-full" /> Sending…</>
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

      {/* Step 2 Checklist */}
      {stepDefs.length > 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Client Kickoff — Checklist</span>
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
