"use client";

import CognitoDataDisplay from "@/components/CognitoDataDisplay";
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
  cognitoUnlinking: boolean;
  xeroConnected: boolean | null;
  xeroPushing: boolean;
  xeroError: string;
  ndaSending: boolean;
  ndaSent: boolean;
  ndaError: string;
  onCognitoOpen: () => void;
  onCognitoUnlink: () => void;
  onXeroPush: () => void;
  onSendNda: () => void;
  onSignOffOpen: () => void;
  onToggleItem: (id: string, val: boolean) => void;
  onToggleChannelItem: (id: string, channelId: string, val: boolean) => void;
};

export default function Step1AccountSetup({
  client,
  channels,
  checklist,
  defs,
  isAdmin,
  saving,
  cognitoUnlinking,
  xeroConnected,
  xeroPushing,
  xeroError,
  ndaSending,
  ndaSent,
  ndaError,
  onCognitoOpen,
  onCognitoUnlink,
  onXeroPush,
  onSendNda,
  onSignOffOpen,
  onToggleItem,
  onToggleChannelItem,
}: Props) {
  const clientChannels = channels.filter((ch) => client.channelIds.includes(ch.id));
  const stepDefs = defs.filter((d) => d.active && (d.step ?? 1) === 1);

  return (
    <div className="space-y-6">
      {/* Cognito Data */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Cognito Billing Data</span>
            {client.cognitoLinkedAt && (
              <span className="ml-2 text-xs text-oj-muted">
                · linked {new Date(client.cognitoLinkedAt).toLocaleDateString("en-ZA")}
              </span>
            )}
          </div>
          {isAdmin ? (
            client.cognitoData ? (
              <div className="flex gap-2">
                <button onClick={onCognitoOpen} className="text-xs font-semibold text-oj-blue hover:text-oj-blue-hover">Re-link</button>
                <button
                  onClick={onCognitoUnlink}
                  disabled={cognitoUnlinking}
                  className="text-xs font-semibold text-oj-orange hover:text-oj-orange-hover disabled:opacity-50"
                >
                  {cognitoUnlinking ? "Unlinking…" : "Unlink"}
                </button>
              </div>
            ) : (
              <button
                onClick={onCognitoOpen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-blue text-white text-xs font-semibold hover:bg-oj-blue-hover"
              >
                + Link Cognito Entry
              </button>
            )
          ) : (
            <span className="text-xs text-oj-muted italic">Admin action</span>
          )}
        </div>
        {client.cognitoData ? (
          <CognitoDataDisplay data={client.cognitoData} />
        ) : (
          <div className="px-5 py-6 text-sm text-oj-muted">
            {isAdmin
              ? <>No Cognito entry linked yet. Click <strong>+ Link Cognito Entry</strong> to search and match the client&apos;s billing submission.</>
              : "No Cognito data linked yet — pending admin action."}
          </div>
        )}
      </div>

      {/* Xero Contact — admin only (visible to both, actions only for admins) */}
      {client.cognitoData && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
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
                {isAdmin && (
                  <button
                    onClick={onXeroPush}
                    disabled={xeroPushing}
                    className="px-3 py-2 text-xs font-medium text-oj-muted border border-oj-border rounded-lg hover:border-oj-blue transition-colors disabled:opacity-50"
                  >
                    {xeroPushing ? "Updating…" : "↻ Sync to Xero"}
                  </button>
                )}
              </div>
            ) : isAdmin ? (
              xeroConnected === false ? (
                <div className="flex items-center gap-2 text-sm text-oj-muted">
                  <span>Xero not connected —</span>
                  <a href="/admin/xero" className="text-oj-blue hover:underline font-medium">Connect in Admin →</a>
                </div>
              ) : (
                <button
                  onClick={onXeroPush}
                  disabled={xeroPushing || xeroConnected === null}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00B4D8] text-white text-sm font-semibold hover:bg-[#0096B4] transition-colors disabled:opacity-60"
                >
                  {xeroPushing ? (
                    <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" /> Creating contact…</>
                  ) : (
                    "Create Xero Contact"
                  )}
                </button>
              )
            ) : (
              <div className="text-sm text-oj-muted italic">Xero sync — pending admin action.</div>
            )}
            {xeroError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{xeroError}</p>
            )}
          </div>
        </div>
      )}

      {/* Legal Documents */}
      <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Legal Documents</span>
          <button
            onClick={onSignOffOpen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-oj-bg border border-oj-border text-oj-dark text-xs font-medium hover:border-oj-blue transition-colors"
          >
            ✉ Send Control File Sign-off
          </button>
        </div>
        <div className="px-5 py-4">
          {isAdmin ? (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col gap-1.5">
                {client.ndaSentAt && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-medium">
                    <span>✓</span> NDA sent {new Date(client.ndaSentAt).toLocaleDateString("en-ZA")}
                  </div>
                )}
                {client.cognitoData ? (
                  ndaSent ? (
                    <span className="text-xs font-semibold text-green-600 px-3 py-2">✓ NDA sent!</span>
                  ) : (
                    <button
                      onClick={onSendNda}
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
          ) : (
            <div className="space-y-2">
              {client.ndaSentAt ? (
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <span className="w-5 h-5 bg-green-500 text-white rounded flex items-center justify-center text-xs">✓</span>
                  NDA sent {new Date(client.ndaSentAt).toLocaleDateString("en-ZA")}
                </div>
              ) : (
                <div className="text-sm text-oj-muted italic">NDA — pending admin action</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Step 1 Checklist */}
      {stepDefs.length > 0 && (
        <div className="bg-oj-white border border-oj-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-oj-bg border-b border-oj-border flex items-center justify-between">
            <span className="text-xs font-bold text-oj-muted uppercase tracking-wider">Account Setup — Checklist</span>
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
