"use client";

import { useInvestor } from "@/context/investor-context";
import { StepIndicator } from "@/components/step-indicator";
import { Button } from "@/components/ui/button";

export default function CompletePage() {
  const { investor, kycData, loading, error } = useInvestor();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent" />
      </div>
    );
  }

  if (error || !investor) {
    return (
      <div className="py-20 text-center">
        <p className="text-destructive">{error || "Inversor no encontrado"}</p>
      </div>
    );
  }

  const ds = (kycData?.extracted_json?.datos_societarios as Record<string, unknown>) || {};
  const rl = (kycData?.extracted_json?.representante_legal_firmante as Record<string, unknown>) || {};

  return (
    <>
      <StepIndicator currentStep="complete" />

      {/* Success section */}
      <div className="animate-fade-in-up py-10 text-center">
        <div
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full text-[2.2rem] text-teal"
          style={{
            background: "linear-gradient(135deg, #d4f1f2, #eef8f9)",
            boxShadow: "0 8px 24px rgba(58, 191, 194, 0.15)",
          }}
        >
          ✓
        </div>
        <h2 className="font-heading text-[1.6rem] font-semibold text-navy">
          Registro completado
        </h2>
        <p className="mx-auto mt-2 max-w-[420px] text-[0.92rem] leading-relaxed text-gray-500">
          Sus datos han sido registrados correctamente. Gracias por completar el
          proceso de registro.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Full-width highlight card */}
        <div
          className="rounded-xl border border-teal border-l-4 p-5 sm:col-span-2"
          style={{
            background: "linear-gradient(135deg, #eef8f9 0%, #e0f5f6 100%)",
          }}
        >
          <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
            Sociedad registrada
          </div>
          <div className="mt-1 text-[1.2rem] font-semibold text-navy">
            {String(ds.denominacion_actual || investor.name || "—")}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
            NIF
          </div>
          <div className="mt-1 text-base font-semibold text-navy">
            {String(ds.nif || "—")}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
          <div className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
            Representante legal
          </div>
          <div className="mt-1 text-base font-semibold text-navy">
            {String(rl.nombre_completo || "—")}
          </div>
        </div>
      </div>

      {/* Download JSON */}
      {kycData?.extracted_json && (
        <Button
          variant="outline"
          className="mt-5 w-full rounded-lg border-navy text-[0.8rem] font-semibold uppercase tracking-wider text-navy hover:bg-navy hover:text-white"
          onClick={() => {
            const json = JSON.stringify(kycData.extracted_json, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const name = String(ds.denominacion_actual || investor.name || "inversor")
              .replace(/\s+/g, "_")
              .toUpperCase();
            a.download = `KYC_${name}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Descargar copia de los datos (JSON)
        </Button>
      )}

      <p className="mt-6 text-center text-[0.75rem] text-gray-400">
        Provalix generará el Protocolo de Inversión y se pondrá en contacto con
        usted.
      </p>
    </>
  );
}
