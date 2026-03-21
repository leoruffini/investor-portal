"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function _g(d: Record<string, unknown> | undefined | null, ...keys: string[]): string {
  let val: unknown = d;
  for (const k of keys) {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      val = (val as Record<string, unknown>)[k];
    } else {
      return "";
    }
  }
  if (val === null || val === undefined) return "";
  return String(val);
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </Label>
      {value.length > 80 || value.includes("\n") ? (
        <Textarea value={value} readOnly rows={3} className="mt-1 rounded-lg border-gray-200 bg-white focus:border-teal focus:ring-teal/15" />
      ) : (
        <Input value={value} readOnly className="mt-1 rounded-lg border-gray-200 bg-white focus:border-teal focus:ring-teal/15" />
      )}
    </div>
  );
}

interface KycReviewFormProps {
  data: Record<string, unknown>;
}

export function KycReviewForm({ data }: KycReviewFormProps) {
  const ds = (data.datos_societarios as Record<string, unknown>) || {};
  const dom = (ds.domicilio_social as Record<string, unknown>) || {};
  const dc = (data.datos_constitucion as Record<string, unknown>) || {};
  const cs = (data.capital_social as Record<string, unknown>) || {};
  const dr = (data.datos_registrales as Record<string, unknown>) || {};
  const oa = (data.organo_administracion as Record<string, unknown>) || {};
  const cargos = (oa.cargos as Array<Record<string, unknown>>) || [];
  const rl = (data.representante_legal_firmante as Record<string, unknown>) || {};

  return (
    <Tabs defaultValue="societarios" className="w-full">
      <TabsList className="flex w-full gap-0 rounded-t-[10px] rounded-b-none border border-b-0 border-gray-200 bg-white p-0 h-auto">
        {[
          { value: "societarios", label: "Datos Societarios" },
          { value: "constitucion", label: "Constitución" },
          { value: "capital", label: "Capital Social" },
          { value: "registrales", label: "Datos Registrales" },
          { value: "organo", label: "Órgano Admin." },
          { value: "representante", label: "Representante" },
        ].map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="flex-1 rounded-none border-b-[3px] border-transparent px-2 py-2.5 text-[0.75rem] font-medium text-gray-500 transition-all data-[state=active]:border-b-teal data-[state=active]:font-semibold data-[state=active]:text-navy data-[state=active]:shadow-none sm:text-[0.8rem]"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab: Datos Societarios */}
      <TabsContent value="societarios" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Denominación social *" value={_g(ds, "denominacion_actual")} />
          <Field label="NIF / CIF *" value={_g(ds, "nif")} />
          <Field label="Forma jurídica" value={_g(ds, "forma_juridica")} />
          <Field label="CNAE" value={_g(ds, "cnae")} />
        </div>
        <p className="mt-4 mb-2 text-sm font-semibold text-navy">Domicilio social</p>
        <div className="grid gap-4 sm:grid-cols-[3fr_1fr]">
          <Field label="Calle y número" value={_g(dom, "calle")} />
          <Field label="Código postal" value={_g(dom, "codigo_postal")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Localidad" value={_g(dom, "localidad")} />
          <Field label="Provincia" value={_g(dom, "provincia")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Objeto social" value={_g(ds, "objeto_social")} wide />
          <Field label="Duración" value={_g(ds, "duracion")} />
          <Field
            label="Denominaciones anteriores"
            value={
              Array.isArray(ds.denominaciones_anteriores)
                ? (ds.denominaciones_anteriores as string[]).join(", ")
                : _g(ds, "denominaciones_anteriores")
            }
          />
        </div>
      </TabsContent>

      {/* Tab: Constitución */}
      <TabsContent value="constitucion" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notario" value={_g(dc, "notario")} />
          <Field label="Localidad del notario" value={_g(dc, "localidad_notario")} />
          <Field label="Fecha de constitución" value={_g(dc, "fecha")} />
          <Field label="Número de protocolo" value={_g(dc, "numero_protocolo")} />
        </div>
      </TabsContent>

      {/* Tab: Capital Social */}
      <TabsContent value="capital" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Importe del capital social" value={_g(cs, "importe")} />
          <Field label="Moneda" value={_g(cs, "moneda")} />
          <Field label="Número de participaciones" value={_g(cs, "num_participaciones")} />
          <Field label="Valor nominal unitario" value={_g(cs, "valor_nominal_unitario")} />
        </div>
      </TabsContent>

      {/* Tab: Datos Registrales */}
      <TabsContent value="registrales" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Registro Mercantil" value={_g(dr, "registro_mercantil")} />
          <Field label="Tomo" value={_g(dr, "tomo")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Folio" value={_g(dr, "folio")} />
          <Field label="Hoja" value={_g(dr, "hoja")} />
          <Field label="Inscripción" value={_g(dr, "inscripcion")} />
        </div>
      </TabsContent>

      {/* Tab: Órgano de Administración */}
      <TabsContent value="organo" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
        <Field label="Tipo de órgano" value={_g(oa, "tipo")} />
        {cargos.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-navy">Cargos</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
                      Cargo
                    </th>
                    <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
                      Nombre completo
                    </th>
                    <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
                      DNI/NIE/Pasaporte
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cargos.map((cargo, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 text-navy">{String(cargo.cargo || "")}</td>
                      <td className="px-4 py-2.5 text-navy">{String(cargo.nombre || "")}</td>
                      <td className="px-4 py-2.5 text-navy">{String(cargo.documento_identidad || "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Tab: Representante Legal */}
      <TabsContent value="representante" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo *" value={_g(rl, "nombre_completo")} />
          <Field label="DNI / NIE *" value={_g(rl, "dni")} />
          <Field label="Cargo en la sociedad" value={_g(rl, "cargo_en_sociedad")} />
          <Field label="Domicilio" value={_g(rl, "domicilio")} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
