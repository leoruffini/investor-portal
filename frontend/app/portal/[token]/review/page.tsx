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
          <p className="text-muted-foreground">
            No hay datos extraídos todavía. Por favor, suba sus documentos
            primero.
          </p>
          <Button
            variant="outline"
            className="mt-4"
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

      <div className="space-y-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-navy">
            Revisar datos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Revise los datos extraídos de sus documentos. Si todo es correcto,
            confirme para continuar.
          </p>
        </div>

        <KycReviewForm data={kycData.extracted_json} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => router.push(`/portal/${params.token}/upload`)}
          >
            Volver a subir
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={confirming}
            className="bg-navy hover:bg-navy/90"
          >
            {confirming ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Confirmando...
              </>
            ) : (
              "Confirmar datos"
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
