"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestor } from "@/context/investor-context";
import { StepIndicator } from "@/components/step-indicator";
import { FileDropzone } from "@/components/file-dropzone";
import { FileList } from "@/components/file-list";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { uploadDocs, pollKycData } from "@/lib/api";

const PROCESS_CARDS = [
  { icon: "📄", title: "1. Suba documentos", desc: "Escrituras, poderes y documentos societarios en PDF" },
  { icon: "⚙", title: "2. Extracción automática", desc: "IA analiza y extrae datos clave de cada documento" },
  { icon: "✅", title: "3. Revise y confirme", desc: "Verifique la información y complete los campos que falten" },
];

const RECOMMENDED_DOCS = [
  { icon: "📝", label: "Escritura de constitución" },
  { icon: "👤", label: "Nombramiento del órgano" },
  { icon: "🔒", label: "Poderes del representante" },
  { icon: "📈", label: "Ampliaciones de capital" },
];

interface ProcessingStep {
  label: string;
  state: "pending" | "active" | "done";
}

function ProcessingSteps({ steps }: { steps: ProcessingStep[] }) {
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

export default function UploadPage() {
  const { investor, loading, error: ctxError, refresh } = useInvestor();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [progressText, setProgressText] = useState("");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent" />
      </div>
    );
  }

  if (ctxError || !investor) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{ctxError || "Inversor no encontrado"}</p>
      </div>
    );
  }

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError("Seleccione al menos un archivo PDF.");
      return;
    }
    try {
      setUploading(true);
      setError(null);

      // Initialize processing steps
      const steps: ProcessingStep[] = [
        { label: "Guardando documentos…", state: "active" },
        { label: "Extrayendo texto de los PDFs…", state: "pending" },
        { label: "Analizando documentos con IA…", state: "pending" },
        { label: "Preparando formulario…", state: "pending" },
      ];
      setProcessingSteps([...steps]);
      setProgressPct(10);
      setProgressText("Guardando documentos…");

      // Simulate step progression during actual upload
      const advanceStep = (idx: number, text: string, pct: number) => {
        steps.forEach((s, i) => {
          if (i < idx) s.state = "done";
          else if (i === idx) s.state = "active";
          else s.state = "pending";
        });
        setProcessingSteps([...steps]);
        setProgressPct(pct);
        setProgressText(text);
      };

      // Step 1: Upload files (returns quickly with 202)
      await uploadDocs(investor.id, files);
      advanceStep(1, "Extrayendo texto de los PDFs…", 20);

      // Step 2-3: Poll for KYC data (OCR + LLM runs in backend background)
      advanceStep(1, "Extrayendo texto de los PDFs…", 30);

      await pollKycData(investor.id, {
        intervalMs: 3000,
        maxAttempts: 60,
      });

      advanceStep(2, "Analizando documentos con IA…", 75);
      await new Promise((r) => setTimeout(r, 400));

      advanceStep(3, "Preparando formulario…", 95);
      await new Promise((r) => setTimeout(r, 300));

      // All done
      steps.forEach((s) => (s.state = "done"));
      setProcessingSteps([...steps]);
      setProgressPct(100);
      setProgressText("Listo");

      await refresh();
      router.push(`/portal/${params.token}/review`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al subir los documentos"
      );
      setUploading(false);
      setProcessingSteps([]);
      setProgressPct(0);
    }
  };

  // Processing view
  if (uploading && processingSteps.length > 0) {
    return (
      <>
        <StepIndicator currentStep="processing" />

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
          <ProcessingSteps steps={processingSteps} />
          {/* Show file extraction results */}
          {files.map((f) => (
            <div key={f.name} className="mt-1 text-[0.85rem] text-navy">
              ✓ {f.name} — {(f.size / 1024).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} KB
            </div>
          ))}
        </div>

      </>
    );
  }

  // Normal upload view
  return (
    <>
      <StepIndicator currentStep="upload" />

      {/* Process overview cards */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {PROCESS_CARDS.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-gray-200 bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:border-teal hover:shadow-[0_4px_12px_rgba(58,191,194,0.1)]"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#eef8f9] to-[#d4f1f2] text-xl">
              {card.icon}
            </div>
            <div className="text-[0.82rem] font-semibold text-navy">
              {card.title}
            </div>
            <div className="mt-1 text-[0.75rem] leading-snug text-gray-400">
              {card.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Section header */}
      <h2 className="font-heading text-[1.3rem] font-semibold text-navy">
        Documentación del inversor
      </h2>
      <p className="mb-4 text-[0.85rem] leading-relaxed text-gray-500">
        Suba los documentos legales de la sociedad inversora en formato PDF.
        Puede subir varios archivos a la vez.
      </p>

      {/* Recommended documents */}
      <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {RECOMMENDED_DOCS.map((doc) => (
          <div
            key={doc.label}
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[0.82rem] text-gray-700 transition-all hover:border-teal hover:bg-[#f0fafb]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[0.9rem]">
              {doc.icon}
            </div>
            <span>{doc.label}</span>
          </div>
        ))}
      </div>

      {/* Dropzone + file list */}
      <FileDropzone onFilesSelected={handleFilesSelected} disabled={uploading} />
      <FileList files={files} onRemove={handleRemove} />

      <hr className="my-5 border-gray-200" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit button */}
      <Button
        onClick={handleUpload}
        disabled={files.length === 0 || uploading}
        className="w-full rounded-lg bg-gradient-to-br from-navy to-[#2d4562] py-5 text-[0.82rem] font-semibold uppercase tracking-wider shadow-[0_2px_8px_rgba(35,51,72,0.2)] transition-all hover:from-[#2d4562] hover:to-[#3a5a7a] hover:shadow-[0_4px_16px_rgba(35,51,72,0.3)]"
      >
        Procesar documentos
      </Button>

      {files.length === 0 && (
        <div className="mt-4 rounded-lg border border-teal/20 bg-[#eef8f9] px-4 py-3 text-[0.85rem] text-navy">
          Suba al menos un documento PDF para continuar.
        </div>
      )}

      {/* Security note */}
      <div className="mt-5 flex items-center gap-2.5 rounded-lg border border-gray-200 bg-light-bg px-4 py-3">
        <span className="shrink-0 text-lg text-teal">🔒</span>
        <span className="text-[0.78rem] leading-snug text-gray-500">
          Sus documentos se procesan de forma segura y no se almacenan en ningún
          servidor externo.
        </span>
      </div>
    </>
  );
}
