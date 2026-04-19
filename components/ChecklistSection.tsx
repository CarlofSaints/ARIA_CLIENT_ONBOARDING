"use client";

import type { ChecklistItemDef, ChecklistItemState, Channel } from "./steps/types";

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  manual: { label: "manual", cls: "bg-blue-50 text-blue-600 border border-blue-200" },
  auto: { label: "auto", cls: "bg-green-50 text-green-600 border border-green-200" },
  either: { label: "either", cls: "bg-amber-50 text-amber-600 border border-amber-200" },
};

type Props = {
  items: ChecklistItemDef[];
  clientChannels: Channel[];
  channelIds: string[];
  checklist: Record<string, ChecklistItemState>;
  saving: string | null;
  isAdmin: boolean;
  onToggleItem: (id: string, val: boolean) => void;
  onToggleChannelItem: (id: string, channelId: string, val: boolean) => void;
};

export default function ChecklistSection({
  items,
  clientChannels,
  channelIds,
  checklist,
  saving,
  isAdmin,
  onToggleItem,
  onToggleChannelItem,
}: Props) {
  if (items.length === 0) return null;

  return (
    <ul className="divide-y divide-oj-border">
      {items.map((item) => {
        const state = checklist[item.id];
        const isAuto = item.type === "auto";
        const isChecked = item.dynamic
          ? channelIds.length > 0 && channelIds.every((cId) => state?.channelStates?.[cId]?.completed)
          : (state?.completed ?? false);
        const badge = TYPE_BADGE[item.type];

        // Admin-only items: disabled for CAMs
        const assignedTo = item.assignedTo ?? "both";
        const isReadOnly = assignedTo === "admin" && !isAdmin;

        // Skippable but incomplete: show amber badge
        const isSkippable = item.skippable ?? false;
        const showComeBackBadge = isSkippable && !item.optional && !isChecked;

        return (
          <li key={item.id} className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                {isAuto || isReadOnly ? (
                  <div className={`w-5 h-5 rounded flex items-center justify-center text-xs ${
                    isChecked
                      ? "bg-green-500 text-white"
                      : isReadOnly
                      ? "bg-gray-100 text-gray-300 border border-gray-200"
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}>
                    {isChecked ? "✓" : isAuto ? "⚙" : "—"}
                  </div>
                ) : (
                  <input
                    type="checkbox"
                    checked={!item.dynamic && isChecked}
                    disabled={item.dynamic || saving === item.id}
                    onChange={() => !item.dynamic && onToggleItem(item.id, !isChecked)}
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
                  {showComeBackBadge && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">come back to this</span>
                  )}
                  {isReadOnly && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-purple-50 text-purple-500 border border-purple-200">admin</span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-oj-muted mt-0.5 leading-relaxed">{item.description}</p>
                )}
                {isReadOnly && !isChecked && (
                  <p className="text-xs text-oj-muted mt-0.5 italic">Pending admin action</p>
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
                      } ${isAuto || isReadOnly ? "cursor-default" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={chChecked}
                        disabled={isAuto || isReadOnly || chSaving}
                        onChange={() => !isAuto && !isReadOnly && onToggleChannelItem(item.id, ch.id, !chChecked)}
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
  );
}
