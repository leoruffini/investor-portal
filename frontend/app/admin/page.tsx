"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPromotions, getInvestorsByPromotion } from "@/lib/api";
import { Promotion, Investor } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PromotionWithStats extends Promotion {
  investorCount: number;
  completeCount: number;
  pendingCount: number;
}

function formatDateES(dateStr: string): string {
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const d = new Date(dateStr);
  return `Creada el ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function AdminDashboardPage() {
  const [promotions, setPromotions] = useState<PromotionWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const promos = await getPromotions();
        const withStats = await Promise.all(
          promos.map(async (p) => {
            const investors = await getInvestorsByPromotion(p.id);
            const completeCount = investors.filter((i: Investor) => i.status === "complete").length;
            return {
              ...p,
              investorCount: investors.length,
              completeCount,
              pendingCount: investors.length - completeCount,
            };
          })
        );
        setPromotions(withStats);
      } catch (err) {
        console.error("Error loading promotions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-navy">
            Promociones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona las promociones y sus inversores
          </p>
        </div>
        <Link href="/admin/promotions/new">
          <Button className="bg-navy hover:bg-navy/90">
            + Nueva promoción
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        </div>
      ) : promotions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 7.5h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
              />
            </svg>
          </div>
          <h2 className="font-heading text-lg font-semibold text-navy">
            Sin promociones
          </h2>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Crea tu primera promoción para empezar a gestionar inversores y documentación.
          </p>
          <Link href="/admin/promotions/new">
            <Button className="mt-6 bg-navy hover:bg-navy/90">
              + Nueva promoción
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {promotions.map((p) => (
            <Link key={p.id} href={`/admin/promotions/${p.id}`}>
              <Card className="shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer h-full group">
                <CardHeader className="pb-3">
                  <CardTitle className="group-hover:text-teal transition-colors">
                    {p.name}
                  </CardTitle>
                  {p.description && (
                    <CardDescription>{p.description}</CardDescription>
                  )}
                  {p.created_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateES(p.created_at)}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="rounded-lg bg-light-bg px-3 py-2 text-center">
                      <p className="text-xl font-bold text-navy">{p.investorCount}</p>
                      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Total
                      </p>
                    </div>
                    <div className="rounded-lg bg-teal/10 px-3 py-2 text-center">
                      <p className="text-xl font-bold text-teal">{p.completeCount}</p>
                      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Completos
                      </p>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
                      <p className="text-xl font-bold text-amber-600">{p.pendingCount}</p>
                      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        Pendientes
                      </p>
                    </div>
                  </div>
                  {p.investorCount > 0 && (
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal transition-all"
                        style={{
                          width: `${(p.completeCount / p.investorCount) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
