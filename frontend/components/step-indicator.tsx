"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { key: "upload", label: "Documentos" },
  { key: "processing", label: "Procesamiento" },
  { key: "review", label: "Revisión" },
  { key: "complete", label: "Confirmación" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function StepIndicator({ currentStep }: { currentStep: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="mb-6 flex overflow-hidden rounded-[10px] border border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;

        return (
          <div
            key={step.key}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 border-b-[3px] border-transparent py-3 text-[0.78rem] font-medium text-gray-400 transition-all duration-300",
              isActive &&
                "border-b-teal bg-teal/[0.04] font-semibold text-navy",
              isDone && "border-b-navy bg-navy/[0.03] text-navy"
            )}
          >
            <span
              className={cn(
                "inline-flex h-[1.4rem] w-[1.4rem] items-center justify-center rounded-full text-[0.7rem] font-bold transition-all duration-300",
                isActive && "animate-pulse-dot bg-teal text-white shadow-[0_2px_8px_rgba(58,191,194,0.3)]",
                isDone && "bg-navy text-white",
                !isActive && !isDone && "bg-gray-200 text-gray-500"
              )}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span className="hidden sm:inline">{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}
