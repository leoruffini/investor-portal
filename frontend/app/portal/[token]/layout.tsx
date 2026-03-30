import { EnrollmentProvider } from "@/context/investor-context";
import { ProvalixLogo } from "@/components/provalix-logo";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <EnrollmentProvider token={token}>
      <div className="flex min-h-screen flex-col">
        {/* Navy gradient header bar */}
        <header
          className="px-4 py-4 sm:px-8"
          style={{
            background:
              "linear-gradient(135deg, #1a2738 0%, #233348 50%, #2a3f5a 100%)",
            boxShadow: "0 2px 12px rgba(35, 51, 72, 0.15)",
          }}
        >
          <div className="mx-auto flex max-w-[860px] items-center justify-between">
            <ProvalixLogo className="h-7 w-auto" />
            <span className="rounded border border-teal/35 px-3 py-1.5 text-[0.68rem] font-medium uppercase tracking-widest text-teal backdrop-blur-sm">
              Portal del Inversor
            </span>
          </div>
        </header>

        {/* Hero section */}
        <div
          className="px-4 pb-4 pt-6 sm:px-8"
          style={{
            background:
              "linear-gradient(180deg, rgba(35,51,72,0.04) 0%, transparent 100%)",
          }}
        >
          <div className="mx-auto max-w-[860px]">
            <h1 className="font-heading text-[1.75rem] font-semibold leading-tight text-navy">
              Registro de datos societarios
            </h1>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-gray-500">
              Suba sus documentos legales y revise la información extraída de
              forma automática para completar el proceso de inversión.
            </p>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1">
          <div className="mx-auto max-w-[860px] px-4 py-4 sm:px-8">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Provalix — Portal del Inversor
        </footer>
      </div>
    </EnrollmentProvider>
  );
}
