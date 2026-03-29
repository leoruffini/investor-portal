"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ProvalixLogo } from "@/components/provalix-logo";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Don't wrap the login page with admin chrome
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch("/admin/api/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col bg-light-bg">
      {/* Header */}
      <header
        className="px-4 py-3 sm:px-8"
        style={{
          background:
            "linear-gradient(135deg, #1a2738 0%, #233348 50%, #2a3f5a 100%)",
          boxShadow: "0 2px 12px rgba(35, 51, 72, 0.15)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/admin" className="flex items-center">
            <ProvalixLogo className="h-6 w-auto" />
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/admin"
              className={`text-sm transition-colors ${
                pathname === "/admin"
                  ? "text-white font-medium"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Promociones
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Provalix — Back Office
      </footer>
    </div>
  );
}
