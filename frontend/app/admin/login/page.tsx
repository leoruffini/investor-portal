"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProvalixLogo } from "@/components/provalix-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/admin/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Error de autenticación");
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-light-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <div className="rounded-xl bg-navy p-4">
            <ProvalixLogo className="h-6 w-auto" />
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 ring-1 ring-foreground/10">
          <h1 className="font-heading text-xl font-semibold text-navy text-center mb-1">
            Back Office
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Introduce la contraseña de administrador
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !password}
              className="w-full bg-navy hover:bg-navy/90"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
