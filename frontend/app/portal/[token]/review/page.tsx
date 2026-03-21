"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useInvestor } from "@/context/investor-context";
import { StepIndicator } from "@/components/step-indicator";
import { KycReviewForm } from "@/components/kyc-review-form";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { confirmKycData } from "@/lib/api";

export default function ReviewPage() {
  const { investor, kycData, loading, error: ctxError, refresh } = useInvestor();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!kycData || !kycData.extracted_json) {
    return (
      <>
        <StepIndicator currentStep="review" />
        <div className="py-12 text-center">
          <p className="text-gray-500">
            No hay datos extraídos todavía. Por favor, suba sus documentos
            primero.
          </p>
          <Button
            variant="outline"
            className="mt-4 rounded-lg"
            onClick={() => router.push(`/portal/${params.token}/upload`)}
          >
            Ir a subir documentos
          </Button>
        </div>
      </>
    );
  }

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      setError(null);
      await confirmKycData(investor.id);
      await refresh();
      router.push(`/portal/${params.token}/complete`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al confirmar los datos"
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      <StepIndicator currentStep="review" />

      <h2 className="font-heading text-[1.3rem] font-semibold text-navy">
        Revisión de datos extraídos
      </h2>
      <p className="mb-5 text-[0.85rem] leading-relaxed text-gray-500">
        Hemos extraído la siguiente información de sus documentos. Revise cada
        campo, corrija lo que sea necesario y complete los datos que falten.
      </p>

      <KycReviewForm data={kycData.extracted_json} />

      <hr className="my-5 border-gray-200" />

      <p className="mb-4 text-[0.82rem] text-gray-400">
        Los campos marcados con * son obligatorios.
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(`/portal/${params.token}/upload`)}
          className="rounded-lg border-gray-300 text-[0.82rem] font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50"
        >
          Volver a subir
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={confirming}
          className="flex-1 rounded-lg bg-gradient-to-br from-navy to-[#2d4562] py-5 text-[0.82rem] font-semibold uppercase tracking-wider shadow-[0_2px_8px_rgba(35,51,72,0.2)] transition-all hover:from-[#2d4562] hover:to-[#3a5a7a] hover:shadow-[0_4px_16px_rgba(35,51,72,0.3)]"
        >
          {confirming ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Confirmando…
            </span>
          ) : (
            "Confirmar y enviar datos"
          )}
        </Button>
      </div>
    </>
  );
}
