"use client";

import type { ChecklistItemDef, ChecklistItemState } from "./steps/types";

export const STEP_LABELS = [
  "Account Setup",
  "Client Kickoff",
  "Infrastructure",
  "Control Files",
  "Training & Sign-off",
];

function computeStepProgress(
  step: number,
  defs: ChecklistItemDef[],
  checklist: Record<string, ChecklistItemState>,
  channelIds: string[]
): number {
  const stepDefs = defs.filter((d) => d.active && !d.optional && (d.step ?? 1) === step);
  if (stepDefs.length === 0) return 100;
  let total = 0;
  let done = 0;
  for (const def of stepDefs) {
    total += 1;
    const state = checklist[def.id];
    if (def.dynamic) {
      if (state?.channelStates && channelIds.length > 0) {
        const completedCount = channelIds.filter((id) => state.channelStates![id]?.completed).length;
        done += completedCount / channelIds.length;
      }
    } else {
      if (state?.completed) done += 1;
    }
  }
  return Math.round((done / total) * 100);
}

type Props = {
  currentStep: number;
  defs: ChecklistItemDef[];
  checklist: Record<string, ChecklistItemState>;
  channelIds: string[];
  onStepClick: (step: number) => void;
};

export default function StepProgressBar({ currentStep, defs, checklist, channelIds, onStepClick }: Props) {
  const progresses = STEP_LABELS.map((_, i) =>
    computeStepProgress(i + 1, defs, checklist, channelIds)
  );

  return (
    <div className="bg-oj-white border border-oj-border rounded-xl p-5 shadow-sm mb-6">
      <div className="relative flex items-start">
        {/* Background connector line */}
        <div className="absolute top-4 left-4 right-4 h-0.5 bg-oj-border" style={{ zIndex: 0 }} />
        {/* Progress fill — up to current step */}
        {currentStep > 1 && (
          <div
            className="absolute top-4 left-4 h-0.5 bg-teal-400 transition-all"
            style={{
              zIndex: 0,
              width: `calc(${((currentStep - 1) / (STEP_LABELS.length - 1)) * 100}% - 2rem)`,
            }}
          />
        )}

        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isPast = step < currentStep;
          const isFuture = step > currentStep;
          const pct = progresses[i];
          const isComplete = pct === 100;

          return (
            <div
              key={step}
              className="relative flex flex-col items-center"
              style={{ zIndex: 1, width: "20%", flexShrink: 0 }}
            >
              <button
                onClick={() => onStepClick(step)}
                title={label}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isPast && isComplete
                    ? "bg-green-500 text-white"
                    : isPast
                    ? "bg-teal-200 text-teal-800"
                    : isActive
                    ? "bg-teal-600 text-white ring-2 ring-teal-300 ring-offset-1"
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {isPast && isComplete ? "✓" : step}
              </button>
              <p
                className={`mt-1.5 text-xs font-medium text-center leading-tight px-0.5 ${
                  isActive ? "text-teal-700" : isFuture ? "text-oj-muted" : "text-oj-dark"
                }`}
              >
                {label}
              </p>
              <p
                className={`text-xs text-center mt-0.5 ${
                  isComplete ? "text-green-600" : isActive ? "text-teal-600" : "text-oj-muted"
                }`}
              >
                {pct}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
