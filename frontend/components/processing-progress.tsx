import { ProcessingStep, ProcessingSteps } from "@/components/processing-steps";

interface ProcessingProgressProps {
  steps: ProcessingStep[];
  progressPct: number;
  progressText: string;
  files: File[];
}

export function ProcessingProgress({
  steps,
  progressPct,
  progressText,
  files,
}: ProcessingProgressProps) {
  return (
    <>
      {/* Progress bar */}
      <div className="mb-1 text-[0.82rem] text-gray-500">{progressText}</div>
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-teal transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Status box with processing steps */}
      <div className="rounded-[10px] border border-gray-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2 text-sm text-navy">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          Analizando documentos…
        </div>
        <ProcessingSteps steps={steps} />
        {/* File list with sizes */}
        {files.map((f) => (
          <div key={f.name} className="mt-1 text-[0.85rem] text-navy">
            ✓ {f.name} —{" "}
            {(f.size / 1024)
              .toFixed(0)
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{" "}
            KB
          </div>
        ))}
      </div>
    </>
  );
}
