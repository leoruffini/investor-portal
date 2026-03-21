"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { key: "upload", label: "Subir documentos" },
  { key: "review", label: "Revisar datos" },
  { key: "complete", label: "Confirmado" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function StepIndicator({ currentStep }: { currentStep: StepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <nav className="flex items-center justify-center gap-2 sm:gap-4 py-6">
      {STEPS.map((step, i) => {
        const isActive = i === currentIndex;
        const isDone = i < currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2 sm:gap-4">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-12",
                  isDone ? "bg-teal" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                  isActive && "bg-teal text-white",
                  isDone && "bg-teal/20 text-teal",
                  !isActive && !isDone && "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "hidden sm:inline text-sm",
                  isActive ? "font-semibold text-navy" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
