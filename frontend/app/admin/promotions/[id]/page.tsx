"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  getPromotion,
  getInvestorsByPromotion,
  deleteInvestor,
  generateProtocol,
} from "@/lib/api";
import { Promotion, Investor, PromotionSettings } from "@/lib/types";
import { updatePromotion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "@/components/copy-link-button";

const fmtEur = (v: number) =>
  v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const fmtInt = (v: number) =>
  Math.round(v).toLocaleString("es-ES", { useGrouping: true });

const fmtPct = (v: number) =>
  v.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + "%";

export default function PromotionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<PromotionSettings>({
    total_investment: null,
    total_shares: null,
    first_disbursement_pct: null,
    second_disbursement_pct: null,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const load = async () => {
    try {
      const [promo, invs] = await Promise.all([
        getPromotion(id),
        getInvestorsByPromotion(id),
      ]);
      setPromotion(promo);
      setInvestors(invs);
      if (promo.settings) {
        setSettings(promo.settings);
      }
    } catch (err) {
      console.error("Error loading promotion:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async (inv: Investor) => {
    if (!confirm(`¿Eliminar al inversor "${inv.name}"?`)) return;
    try {
      await deleteInvestor(inv.id);
      setInvestors((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (err) {
      console.error("Error deleting investor:", err);
    }
  };

  const handleGenerateAll = async () => {
    const eligible = investors.filter((i) => i.status === "data_confirmed");
    if (eligible.length === 0) return;
    setGeneratingAll(true);
    try {
      for (const inv of eligible) {
        const blob = await generateProtocol(inv.id);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `protocolo_${inv.name.replace(/\s+/g, "_")}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      }
      await load();
    } catch (err) {
      console.error("Error generating protocols:", err);
      alert("Error al generar los protocolos");
    } finally {
      setGeneratingAll(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const updated = await updatePromotion(id, { settings });
      setPromotion(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err) {
      console.error("Error saving settings:", err);
      alert("Error al guardar las variables");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSetting = (key: keyof PromotionSettings, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value === "" ? null : key === "total_shares" ? parseInt(value, 10) : parseFloat(value),
    }));
  };

  const disbursementWarning =
    settings.first_disbursement_pct != null &&
    settings.second_disbursement_pct != null &&
    Math.abs(settings.first_disbursement_pct + settings.second_disbursement_pct - 100) > 0.01;

  const calcOwnership = (inv: Investor) => {
    if (!inv.investment_amount || !settings.total_investment) return null;
    return (inv.investment_amount / settings.total_investment) * 100;
  };

  const calcShares = (inv: Investor) => {
    if (!inv.investment_amount || !settings.total_investment || !settings.total_shares) return null;
    return Math.round((inv.investment_amount / settings.total_investment) * settings.total_shares);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!promotion) {
    return <p className="text-muted-foreground">Promoción no encontrada.</p>;
  }

  const allComplete = investors.length > 0 && investors.every((i) => i.status === "complete");
  const someConfirmed = investors.some((i) => i.status === "data_confirmed");

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-navy transition-colors"
        >
          ← Volver a promociones
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-navy">
              {promotion.name}
            </h1>
            {promotion.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {promotion.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {someConfirmed && (
              <Button
                onClick={handleGenerateAll}
                disabled={generatingAll}
                variant="outline"
                className="border-teal text-teal hover:bg-teal/5"
              >
                {generatingAll ? "Generando..." : "Generar protocolos"}
              </Button>
            )}
            <Link href={`/admin/promotions/${id}/investors/new`}>
              <Button className="bg-navy hover:bg-navy/90">
                + Añadir inversores
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: investors.length },
          {
            label: "Pendientes",
            value: investors.filter((i) => i.status === "pending").length,
          },
          {
            label: "En proceso",
            value: investors.filter(
              (i) => i.status === "docs_uploaded" || i.status === "data_confirmed"
            ).length,
          },
          {
            label: "Completados",
            value: investors.filter((i) => i.status === "complete").length,
          },
        ].map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-semibold text-navy">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Promotion settings */}
      <Card className="mb-6">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-semibold text-navy">
            Variables de la promoción
          </span>
          <ChevronDown
            className={`h-4 w-4 text-gray-400 transition-transform ${settingsOpen ? "rotate-180" : ""}`}
          />
        </button>
        {settingsOpen && (
          <CardContent className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Inversión total (€)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={settings.total_investment ?? ""}
                  onChange={(e) => updateSetting("total_investment", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  placeholder="0"
                />
                {settings.total_investment != null && (
                  <p className="mt-1 text-xs text-gray-400">{fmtEur(settings.total_investment)}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Participaciones totales
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={settings.total_shares ?? ""}
                  onChange={(e) => updateSetting("total_shares", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  placeholder="0"
                />
                {settings.total_shares != null && (
                  <p className="mt-1 text-xs text-gray-400">{fmtInt(settings.total_shares)}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  % primer desembolso
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={settings.first_disbursement_pct ?? ""}
                  onChange={(e) => updateSetting("first_disbursement_pct", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  placeholder="30"
                />
                {settings.first_disbursement_pct != null && (
                  <p className="mt-1 text-xs text-gray-400">{fmtPct(settings.first_disbursement_pct)}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  % segundo desembolso
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={settings.second_disbursement_pct ?? ""}
                  onChange={(e) => updateSetting("second_disbursement_pct", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  placeholder="70"
                />
                {settings.second_disbursement_pct != null && (
                  <p className="mt-1 text-xs text-gray-400">{fmtPct(settings.second_disbursement_pct)}</p>
                )}
              </div>
            </div>
            {disbursementWarning && (
              <p className="mt-3 text-xs text-red-500">
                Los porcentajes de desembolso deben sumar 100% (actual:{" "}
                {(settings.first_disbursement_pct! + settings.second_disbursement_pct!).toFixed(1)}%)
              </p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings || disbursementWarning}
                className="bg-navy hover:bg-navy/90"
                size="sm"
              >
                {savingSettings ? "Guardando..." : "Guardar"}
              </Button>
              {settingsSaved && (
                <span className="text-xs text-emerald-600">Guardado</span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {allComplete && investors.length > 0 && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Todos los inversores han completado el proceso.
        </div>
      )}

      {/* Investor table */}
      {investors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay inversores en esta promoción.
            </p>
            <Link href={`/admin/promotions/${id}/investors/new`}>
              <Button className="mt-4 bg-navy hover:bg-navy/90">
                Añadir inversores
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Nombre
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Inversión
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    %
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Partic.
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {investors.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-navy whitespace-nowrap">
                      {inv.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3 text-right text-navy whitespace-nowrap">
                      {inv.investment_amount
                        ? fmtEur(inv.investment_amount)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-navy whitespace-nowrap">
                      {calcOwnership(inv) != null
                        ? fmtPct(calcOwnership(inv)!)
                        : inv.ownership_pct != null
                          ? fmtPct(inv.ownership_pct)
                          : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-navy whitespace-nowrap">
                      {calcShares(inv) != null
                        ? fmtInt(calcShares(inv)!)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <CopyLinkButton token={inv.token} />
                        <Link
                          href={`/admin/promotions/${id}/investors/${inv.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-navy hover:text-navy whitespace-nowrap"
                        >
                          Ver detalle
                        </Link>
                        <button
                          onClick={() => handleDelete(inv)}
                          className="rounded-lg border border-gray-200 p-1.5 text-gray-400 transition-colors hover:border-red-300 hover:text-red-500"
                          title="Eliminar inversor"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
