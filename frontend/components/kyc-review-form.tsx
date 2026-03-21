"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Map of known field keys to human-readable Spanish labels
const FIELD_LABELS: Record<string, string> = {
  denominacion_social: "Denominación social",
  cif: "CIF / NIF",
  domicilio_social: "Domicilio social",
  localidad: "Localidad",
  provincia: "Provincia",
  codigo_postal: "Código postal",
  fecha_constitucion: "Fecha de constitución",
  notario_constitucion: "Notario de constitución",
  numero_protocolo_constitucion: "Nº protocolo constitución",
  datos_registro_mercantil: "Datos del Registro Mercantil",
  objeto_social: "Objeto social",
  representante_nombre: "Nombre del representante",
  representante_dni: "DNI del representante",
  representante_cargo: "Cargo del representante",
  notario_poder: "Notario del poder",
  fecha_poder: "Fecha del poder",
  numero_protocolo_poder: "Nº protocolo poder",
};

function getLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isLongValue(value: unknown): boolean {
  return typeof value === "string" && value.length > 80;
}

interface KycReviewFormProps {
  data: Record<string, unknown>;
  readOnly?: boolean;
}

export function KycReviewForm({ data, readOnly = true }: KycReviewFormProps) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  if (entries.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No se han extraído datos todavía.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-lg">Datos extraídos</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {entries.map(([key, value]) => {
          const stringValue =
            typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
          const long = isLongValue(stringValue) || typeof value === "object";

          return (
            <div key={key} className={long ? "sm:col-span-2" : ""}>
              <Label className="text-xs text-muted-foreground">{getLabel(key)}</Label>
              {long ? (
                <Textarea
                  value={stringValue}
                  readOnly={readOnly}
                  rows={3}
                  className="mt-1 bg-muted/50"
                />
              ) : (
                <Input
                  value={stringValue}
                  readOnly={readOnly}
                  className="mt-1 bg-muted/50"
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
