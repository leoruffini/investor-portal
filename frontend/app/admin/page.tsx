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
            return {
              ...p,
              investorCount: investors.length,
              completeCount: investors.filter((i: Investor) => i.status === "complete").length,
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
      <div className="flex items-center justify-between mb-6">
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
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No hay promociones todavía.
            </p>
            <Link href="/admin/promotions/new">
              <Button className="mt-4 bg-navy hover:bg-navy/90">
                Crear primera promoción
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((p) => (
            <Link key={p.id} href={`/admin/promotions/${p.id}`}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  {p.description && (
                    <CardDescription>{p.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {p.investorCount} inversor{p.investorCount !== 1 ? "es" : ""}
                    </span>
                    <span className="text-sm font-medium text-navy">
                      {p.completeCount}/{p.investorCount} completos
                    </span>
                  </div>
                  {p.investorCount > 0 && (
                    <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
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
