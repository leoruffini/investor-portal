"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createInvestor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function NewInvestorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: promotionId } = use(params);
  const router = useRouter();

  // Individual form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [pct, setPct] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Bulk CSV
  const [csvText, setCsvText] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: string[] } | null>(null);

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await createInvestor({
        name,
        email,
        promotion_id: promotionId,
        investment_amount: amount ? parseFloat(amount) : undefined,
        ownership_pct: pct ? parseFloat(pct) : undefined,
      });
      router.push(`/admin/promotions/${promotionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear inversor");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async () => {
    setBulkResult(null);
    setBulkLoading(true);

    const lines = csvText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.toLowerCase().startsWith("nombre"));

    const errors: string[] = [];
    let created = 0;

    for (const line of lines) {
      const parts = line.split(/[;,\t]/).map((p) => p.trim());
      if (parts.length < 2) {
        errors.push(`Línea inválida (faltan campos): "${line}"`);
        continue;
      }

      const [invName, invEmail, invAmount, invPct] = parts;

      try {
        await createInvestor({
          name: invName,
          email: invEmail,
          promotion_id: promotionId,
          investment_amount: invAmount ? parseFloat(invAmount) : undefined,
          ownership_pct: invPct ? parseFloat(invPct) : undefined,
        });
        created++;
      } catch {
        errors.push(`Error con "${invName}": no se pudo crear`);
      }
    }

    setBulkResult({ created, errors });
    setBulkLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/promotions/${promotionId}`}
          className="text-sm text-muted-foreground hover:text-navy transition-colors"
        >
          ← Volver a la promoción
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-navy">
          Añadir inversores
        </h1>
      </div>

      <Tabs defaultValue="individual" className="max-w-2xl">
        <TabsList>
          <TabsTrigger value="individual">Individual</TabsTrigger>
          <TabsTrigger value="bulk">Carga masiva (CSV)</TabsTrigger>
        </TabsList>

        <TabsContent value="individual">
          <Card>
            <CardContent>
              <form onSubmit={handleIndividualSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Inversiones Levante S.L."
                      className="mt-1"
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@empresa.com"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Importe inversión (€)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="500000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pct">% Participación</Label>
                    <Input
                      id="pct"
                      type="number"
                      step="0.01"
                      value={pct}
                      onChange={(e) => setPct(e.target.value)}
                      placeholder="8.5"
                      className="mt-1"
                    />
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={loading || !name.trim() || !email.trim()}
                    className="bg-navy hover:bg-navy/90"
                  >
                    {loading ? "Creando..." : "Añadir inversor"}
                  </Button>
                  <Link href={`/admin/promotions/${promotionId}`}>
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pega los datos CSV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Formato: <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">nombre, email, importe, porcentaje</code>
                <br />
                Separador: coma, punto y coma, o tabulador. Una línea por inversor.
              </p>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Inversiones Levante S.L., admin@levante.com, 500000, 8.5\nGrupo Mediterráneo S.A., info@grupomed.com, 300000, 5.1`}
                rows={8}
                className="font-mono text-sm"
              />

              {bulkResult && (
                <div className="rounded-lg border px-4 py-3 text-sm">
                  <p className="font-medium text-navy">
                    {bulkResult.created} inversor{bulkResult.created !== 1 ? "es" : ""} creado{bulkResult.created !== 1 ? "s" : ""}
                  </p>
                  {bulkResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-destructive">
                      {bulkResult.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleBulkSubmit}
                  disabled={bulkLoading || !csvText.trim()}
                  className="bg-navy hover:bg-navy/90"
                >
                  {bulkLoading ? "Procesando..." : "Importar inversores"}
                </Button>
                {bulkResult && bulkResult.created > 0 && (
                  <Link href={`/admin/promotions/${promotionId}`}>
                    <Button variant="outline">Ver promoción</Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
