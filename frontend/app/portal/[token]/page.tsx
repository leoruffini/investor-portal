"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useEnrollment } from "@/context/investor-context";

export default function PortalRedirect() {
  const { enrollment, loading, error } = useEnrollment();
  const router = useRouter();
  const params = useParams<{ token: string }>();

  useEffect(() => {
    if (loading || error || !enrollment) return;

    const base = `/portal/${params.token}`;
    switch (enrollment.status) {
      case "pending":
        router.replace(`${base}/upload`);
        break;
      case "docs_uploaded":
        router.replace(`${base}/review`);
        break;
      case "data_confirmed":
      case "complete":
        router.replace(`${base}/complete`);
        break;
      default:
        router.replace(`${base}/upload`);
    }
  }, [enrollment, loading, error, router, params.token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Si cree que esto es un error, contacte con Provalix.
        </p>
      </div>
    );
  }

  return null;
}
