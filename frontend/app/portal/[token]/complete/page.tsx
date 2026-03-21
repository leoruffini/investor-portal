"use client";

import { useInvestor } from "@/context/investor-context";
import { StepIndicator } from "@/components/step-indicator";
import { Card, CardContent } from "@/components/ui/card";

export default function CompletePage() {
  const { investor, loading, error } = useInvestor();

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

  return (
    <>
      <StepIndicator currentStep="complete" />

      <Card className="text-center">
        <CardContent className="py-12 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
            <svg
              className="h-8 w-8 text-teal"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
          <h2 className="font-heading text-2xl font-bold text-navy">
            Datos confirmados
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Gracias, <span className="font-medium text-navy">{investor.name}</span>.
            Sus datos han sido confirmados correctamente. Provalix generará el
            Protocolo de Inversión y se pondrá en contacto con usted.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
