import type { InvestorStatus } from "@/lib/types";

const config: Record<InvestorStatus, { label: string; className: string }> = {
  pending: {
    label: "Pendiente",
    className: "bg-gray-100 text-gray-600",
  },
  docs_uploaded: {
    label: "Docs subidos",
    className: "bg-amber-50 text-amber-700",
  },
  data_confirmed: {
    label: "Datos confirmados",
    className: "bg-blue-50 text-blue-700",
  },
  complete: {
    label: "Completado",
    className: "bg-emerald-50 text-emerald-700",
  },
};

export function StatusBadge({ status }: { status: InvestorStatus }) {
  const { label, className } = config[status] ?? config.pending;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
