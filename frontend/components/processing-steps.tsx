export interface ProcessingStep {
  label: string;
  state: "pending" | "active" | "done";
}

export function ProcessingSteps({ steps }: { steps: ProcessingStep[] }) {
  return (
    <div className="my-6">
      {steps.map((step, i) => (
        <div key={i} className="relative flex items-start gap-4 py-3">
          {/* Vertical connector line */}
          {i < steps.length - 1 && (
            <div
              className="absolute left-[15px] top-[42px] bottom-0 w-0.5"
              style={{
                background:
                  step.state === "done"
                    ? "#233348"
                    : step.state === "active"
                    ? "linear-gradient(180deg, #3ABFC2 0%, #e5e7eb 100%)"
                    : "#e5e7eb",
              }}
            />
          )}
          {/* Dot */}
          <div
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.75rem] font-bold transition-all duration-300 ${
              step.state === "active"
                ? "animate-pulse-dot bg-teal text-white"
                : step.state === "done"
                ? "bg-navy text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {step.state === "done" ? "✓" : i + 1}
          </div>
          {/* Label */}
          <span
            className={`pt-1 text-[0.88rem] font-medium ${
              step.state === "active"
                ? "font-semibold text-navy"
                : step.state === "done"
                ? "text-navy"
                : "text-gray-400"
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
