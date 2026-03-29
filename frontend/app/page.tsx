import Link from "next/link";
import { ProvalixLogo } from "@/components/provalix-logo";
import {
  FileText,
  ShieldCheck,
  ClipboardCheck,
  ArrowRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-navy p-2">
              <ProvalixLogo className="h-5 w-auto" />
            </div>
            <span className="font-heading text-lg font-semibold text-navy">
              Portal del Inversor
            </span>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              <Lock className="h-3.5 w-3.5" />
              Backoffice
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col">
        <section className="bg-navy px-6 py-20 text-center text-white">
          <div className="mx-auto max-w-2xl">
            <h1 className="font-heading text-4xl font-bold leading-tight md:text-5xl">
              Gestión documental
              <span className="block text-teal">para inversores</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-white/70">
              Plataforma segura para gestionar toda la documentación y
              comunicación entre Provalix y sus inversores.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center font-heading text-2xl font-semibold text-navy">
              Cómo funciona
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal/10">
                  <FileText className="h-7 w-7 text-teal" />
                </div>
                <h3 className="mt-4 font-semibold text-navy">
                  1. Subir documentos
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Escrituras de constitución, nombramientos y poderes en formato
                  PDF.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal/10">
                  <ShieldCheck className="h-7 w-7 text-teal" />
                </div>
                <h3 className="mt-4 font-semibold text-navy">
                  2. Extracción automática
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  La IA extrae los datos clave de cada documento de forma segura
                  y precisa.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-teal/10">
                  <ClipboardCheck className="h-7 w-7 text-teal" />
                </div>
                <h3 className="mt-4 font-semibold text-navy">
                  3. Revisar y confirmar
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Revise los datos extraídos, confirme y avance en el proceso
                  de inversión.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA for investors */}
        <section className="border-t border-border bg-white px-6 py-12">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <h2 className="font-heading text-xl font-semibold text-navy">
              ¿Es usted inversor?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Acceda al portal mediante el enlace personalizado que le ha
              proporcionado Provalix por email.
            </p>
            <div className="mt-4 rounded-lg bg-light-bg px-5 py-3 text-sm text-muted-foreground">
              Su enlace tiene el formato:{" "}
              <code className="rounded bg-navy/5 px-1.5 py-0.5 font-mono text-navy">
                /portal/su-token
              </code>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-white px-6 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-xs text-muted-foreground">
          <span>Provalix Homes S.L.</span>
          <Link
            href="/admin"
            className="flex items-center gap-1 hover:text-navy transition-colors"
          >
            Acceso administración
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </footer>
    </div>
  );
}
