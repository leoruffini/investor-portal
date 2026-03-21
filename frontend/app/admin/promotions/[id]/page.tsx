"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  getPromotion,
  getInvestorsByPromotion,
  deleteInvestor,
  generateProtocol,
} from "@/lib/api";
import { Promotion, Investor } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { CopyLinkButton } from "@/components/copy-link-button";

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

  const load = async () => {
    try {
      const [promo, invs] = await Promise.all([
        getPromotion(id),
        getInvestorsByPromotion(id),
      ]);
      setPromotion(promo);
      setInvestors(invs);
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
            <table className="w-full text-sm">
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
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Enlace
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
                    <td className="px-4 py-3 font-medium text-navy">
                      {inv.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3 text-right text-navy">
                      {inv.investment_amount
                        ? `${inv.investment_amount.toLocaleString("es-ES")} €`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-navy">
                      {inv.ownership_pct != null
                        ? `${inv.ownership_pct}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <CopyLinkButton token={inv.token} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/promotions/${id}/investors/${inv.id}`}
                          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-navy hover:text-navy"
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
