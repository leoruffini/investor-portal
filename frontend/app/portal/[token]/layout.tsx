import { InvestorProvider } from "@/context/investor-context";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <InvestorProvider token={token}>
      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <div>
              <h1 className="font-heading text-xl font-bold text-navy">
                Provalix
              </h1>
              <p className="text-xs text-muted-foreground">
                Portal del Inversor
              </p>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1">
          <div className="mx-auto max-w-3xl px-4 py-6">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Provalix — Portal del Inversor
        </footer>
      </div>
    </InvestorProvider>
  );
}
