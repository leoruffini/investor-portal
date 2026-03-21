"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPromotion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export default function NewPromotionPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const promo = await createPromotion({
        name,
        description: description || undefined,
      });
      router.push(`/admin/promotions/${promo.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la promoción");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin"
          className="text-sm text-muted-foreground hover:text-navy transition-colors"
        >
          ← Volver a promociones
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold text-navy">
          Nueva promoción
        </h1>
      </div>

      <Card className="max-w-lg">
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre de la promoción *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Residencial Marina Norte"
                className="mt-1"
                required
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional de la promoción"
                className="mt-1"
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="bg-navy hover:bg-navy/90"
              >
                {loading ? "Creando..." : "Crear promoción"}
              </Button>
              <Link href="/admin">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
