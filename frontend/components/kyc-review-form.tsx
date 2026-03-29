"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
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

/** Set a nested value by dot-separated path (e.g. "datos_societarios.nif") */
function setNested(obj: Record<string, unknown>, path: string, value: string) {
  const parts = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function Field({
  label,
  initialValue,
  path,
  wide,
  readOnly,
  onFieldChange,
}: {
  label: string;
  initialValue: string;
  path: string;
  wide?: boolean;
  readOnly?: boolean;
  onFieldChange: (path: string, value: string) => void;
}) {
  const [val, setVal] = useState(initialValue);
  const handleChange = (v: string) => {
    setVal(v);
    onFieldChange(path, v);
  };
  const roClass = readOnly ? "mt-1 rounded-lg border-gray-200 bg-gray-50 text-gray-600 cursor-default" : "mt-1 rounded-lg border-gray-200 bg-white focus:border-teal focus:ring-teal/15";
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <Label className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </Label>
      {initialValue.length > 80 || initialValue.includes("\n") ? (
        <Textarea
          value={val}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          rows={3}
          className={roClass}
        />
      ) : (
        <Input
          value={val}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={readOnly}
          tabIndex={readOnly ? -1 : undefined}
          className={roClass}
        />
      )}
    </div>
  );
}

interface CargoRow {
  cargo: string;
  nombre: string;
  documento_identidad: string;
}

export interface KycReviewFormHandle {
  getData: () => Record<string, unknown>;
}

interface KycReviewFormProps {
  data: Record<string, unknown>;
  readOnly?: boolean;
}

export const KycReviewForm = forwardRef<KycReviewFormHandle, KycReviewFormProps>(
  function KycReviewForm({ data, readOnly }, ref) {
    const ds = (data.datos_societarios as Record<string, unknown>) || {};
    const dom = (ds.domicilio_social as Record<string, unknown>) || {};
    const dc = (data.datos_constitucion as Record<string, unknown>) || {};
    const cs = (data.capital_social as Record<string, unknown>) || {};
    const dr = (data.datos_registrales as Record<string, unknown>) || {};
    const oa = (data.organo_administracion as Record<string, unknown>) || {};
    const cargosRaw = (oa.cargos as Array<Record<string, unknown>>) || [];
    const rl = (data.representante_legal_firmante as Record<string, unknown>) || {};

    // Track all field edits in a ref (doesn't cause re-renders)
    const editsRef = useRef<Record<string, string>>({});

    const handleFieldChange = (path: string, value: string) => {
      editsRef.current[path] = value;
    };

    // Cargos table state
    const [cargos, setCargos] = useState<CargoRow[]>(
      cargosRaw.map((c) => ({
        cargo: String(c.cargo || ""),
        nombre: String(c.nombre || ""),
        documento_identidad: String(c.documento_identidad || ""),
      }))
    );

    const updateCargo = (index: number, field: keyof CargoRow, value: string) => {
      setCargos((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };

    const addCargo = () => {
      setCargos((prev) => [...prev, { cargo: "", nombre: "", documento_identidad: "" }]);
    };

    const removeCargo = (index: number) => {
      setCargos((prev) => prev.filter((_, i) => i !== index));
    };

    // Expose getData() to parent via ref
    useImperativeHandle(ref, () => ({
      getData: () => {
        // Deep clone the original data
        const result = structuredClone(data);

        // Apply field edits
        for (const [path, value] of Object.entries(editsRef.current)) {
          setNested(result as Record<string, unknown>, path, value);
        }

        // Apply cargos edits
        if (!result.organo_administracion || typeof result.organo_administracion !== "object") {
          (result as Record<string, unknown>).organo_administracion = {};
        }
        (result.organo_administracion as Record<string, unknown>).cargos = cargos;

        return result as Record<string, unknown>;
      },
    }));

    return (
      <Tabs defaultValue="societarios" className="w-full">
        <TabsList className="scrollbar-hide flex w-full cursor-pointer gap-0 overflow-x-auto rounded-t-[10px] rounded-b-none border border-b-0 border-gray-200 bg-white p-0 px-2 h-auto">
          {[
            { value: "societarios", label: "Datos Societarios" },
            { value: "constitucion", label: "Constitución" },
            { value: "capital", label: "Capital Social" },
            { value: "registrales", label: "Datos Registrales" },
            { value: "organo", label: "Órgano de Administración" },
            { value: "representante", label: "Representante Legal" },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="shrink-0 cursor-pointer rounded-none border-b-[3px] border-transparent px-2.5 py-2.5 text-[0.75rem] font-medium whitespace-nowrap text-gray-500 transition-all hover:text-navy data-[state=active]:border-b-teal data-[state=active]:font-semibold data-[state=active]:text-navy data-[state=active]:shadow-none sm:text-[0.8rem]"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab: Datos Societarios */}
        <TabsContent value="societarios" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Denominación social *" initialValue={_g(ds, "denominacion_actual")} path="datos_societarios.denominacion_actual" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="NIF / CIF *" initialValue={_g(ds, "nif")} path="datos_societarios.nif" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Forma jurídica" initialValue={_g(ds, "forma_juridica")} path="datos_societarios.forma_juridica" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="CNAE" initialValue={_g(ds, "cnae")} path="datos_societarios.cnae" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
          <p className="mt-4 mb-2 text-sm font-semibold text-navy">Domicilio social</p>
          <div className="grid gap-4 sm:grid-cols-[3fr_1fr]">
            <Field label="Calle y número" initialValue={_g(dom, "calle")} path="datos_societarios.domicilio_social.calle" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Código postal" initialValue={_g(dom, "codigo_postal")} path="datos_societarios.domicilio_social.codigo_postal" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Localidad" initialValue={_g(dom, "localidad")} path="datos_societarios.domicilio_social.localidad" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Provincia" initialValue={_g(dom, "provincia")} path="datos_societarios.domicilio_social.provincia" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Objeto social" initialValue={_g(ds, "objeto_social")} path="datos_societarios.objeto_social" readOnly={readOnly} onFieldChange={handleFieldChange} wide />
            <Field label="Duración" initialValue={_g(ds, "duracion")} path="datos_societarios.duracion" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field
              label="Denominaciones anteriores"
              initialValue={
                Array.isArray(ds.denominaciones_anteriores)
                  ? (ds.denominaciones_anteriores as string[]).join(", ")
                  : _g(ds, "denominaciones_anteriores")
              }
              path="datos_societarios.denominaciones_anteriores"
              readOnly={readOnly}
              onFieldChange={handleFieldChange}
            />
          </div>
        </TabsContent>

        {/* Tab: Constitución */}
        <TabsContent value="constitucion" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Notario" initialValue={_g(dc, "notario")} path="datos_constitucion.notario" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Localidad del notario" initialValue={_g(dc, "localidad_notario")} path="datos_constitucion.localidad_notario" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Fecha de constitución" initialValue={_g(dc, "fecha")} path="datos_constitucion.fecha" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Número de protocolo" initialValue={_g(dc, "numero_protocolo")} path="datos_constitucion.numero_protocolo" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
        </TabsContent>

        {/* Tab: Capital Social */}
        <TabsContent value="capital" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Importe del capital social" initialValue={_g(cs, "importe")} path="capital_social.importe" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Moneda" initialValue={_g(cs, "moneda")} path="capital_social.moneda" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Número de participaciones" initialValue={_g(cs, "num_participaciones")} path="capital_social.num_participaciones" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Valor nominal unitario" initialValue={_g(cs, "valor_nominal_unitario")} path="capital_social.valor_nominal_unitario" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
        </TabsContent>

        {/* Tab: Datos Registrales */}
        <TabsContent value="registrales" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registro Mercantil" initialValue={_g(dr, "registro_mercantil")} path="datos_registrales.registro_mercantil" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Tomo" initialValue={_g(dr, "tomo")} path="datos_registrales.tomo" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Folio" initialValue={_g(dr, "folio")} path="datos_registrales.folio" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Hoja" initialValue={_g(dr, "hoja")} path="datos_registrales.hoja" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Inscripción" initialValue={_g(dr, "inscripcion")} path="datos_registrales.inscripcion" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
        </TabsContent>

        {/* Tab: Órgano de Administración */}
        <TabsContent value="organo" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
          <Field label="Tipo de órgano" initialValue={_g(oa, "tipo")} path="organo_administracion.tipo" readOnly={readOnly} onFieldChange={handleFieldChange} />
          <div className="mt-4">
            <p className="mb-1 text-sm font-semibold text-navy">Cargos</p>
            {!readOnly && <p className="mb-2 text-[0.75rem] text-gray-400">Puede añadir o eliminar filas con los botones de la tabla.</p>}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-3 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
                      Cargo
                    </th>
                    <th className="px-3 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
                      Nombre completo
                    </th>
                    <th className="px-3 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
                      DNI/NIE/Pasaporte
                    </th>
                    {!readOnly && <th className="w-10 px-2 py-2.5" />}
                  </tr>
                </thead>
                <tbody>
                  {cargos.map((cargo, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-1.5">
                        <Input
                          value={cargo.cargo}
                          onChange={(e) => updateCargo(i, "cargo", e.target.value)}
                          readOnly={readOnly}
                          tabIndex={readOnly ? -1 : undefined}
                          className={readOnly ? "h-8 rounded border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-default" : "h-8 rounded border-gray-200 text-sm text-navy focus:border-teal focus:ring-teal/15"}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          value={cargo.nombre}
                          onChange={(e) => updateCargo(i, "nombre", e.target.value)}
                          readOnly={readOnly}
                          tabIndex={readOnly ? -1 : undefined}
                          className={readOnly ? "h-8 rounded border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-default" : "h-8 rounded border-gray-200 text-sm text-navy focus:border-teal focus:ring-teal/15"}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          value={cargo.documento_identidad}
                          onChange={(e) => updateCargo(i, "documento_identidad", e.target.value)}
                          readOnly={readOnly}
                          tabIndex={readOnly ? -1 : undefined}
                          className={readOnly ? "h-8 rounded border-gray-200 bg-gray-50 text-sm text-gray-600 cursor-default" : "h-8 rounded border-gray-200 text-sm text-navy focus:border-teal focus:ring-teal/15"}
                        />
                      </td>
                      {!readOnly && (
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeCargo(i)}
                          className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Eliminar fila"
                        >
                          ✕
                        </button>
                      </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!readOnly && (
            <button
              type="button"
              onClick={addCargo}
              className="mt-2 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-[0.8rem] font-medium text-gray-500 transition-colors hover:border-teal hover:text-teal"
            >
              + Añadir fila
            </button>
            )}
          </div>
        </TabsContent>

        {/* Tab: Representante Legal */}
        <TabsContent value="representante" className="mt-0 rounded-b-[10px] border border-t-0 border-gray-200 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre completo *" initialValue={_g(rl, "nombre_completo")} path="representante_legal_firmante.nombre_completo" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="DNI / NIE *" initialValue={_g(rl, "dni")} path="representante_legal_firmante.dni" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Cargo en la sociedad" initialValue={_g(rl, "cargo_en_sociedad")} path="representante_legal_firmante.cargo_en_sociedad" readOnly={readOnly} onFieldChange={handleFieldChange} />
            <Field label="Domicilio" initialValue={_g(rl, "domicilio")} path="representante_legal_firmante.domicilio" readOnly={readOnly} onFieldChange={handleFieldChange} />
          </div>
        </TabsContent>
      </Tabs>
    );
  }
);
