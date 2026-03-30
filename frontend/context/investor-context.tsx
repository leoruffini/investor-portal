"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { PromotionInvestor, KycData } from "@/lib/types";
import { getEnrollmentByToken, getKycData, getEnrollment } from "@/lib/api";

interface EnrollmentContextValue {
  enrollment: PromotionInvestor | null;
  kycData: KycData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const EnrollmentContext = createContext<EnrollmentContextValue>({
  enrollment: null,
  kycData: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useEnrollment() {
  return useContext(EnrollmentContext);
}

export function EnrollmentProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const [enrollment, setEnrollment] = useState<PromotionInvestor | null>(null);
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let enr = enrollment;
      if (!enr) {
        enr = await getEnrollmentByToken(token);
        if (!enr) {
          setError("Enlace no válido. Contacte con Provalix.");
          return;
        }
        setEnrollment(enr);
      } else {
        enr = await getEnrollment(enr.id);
        setEnrollment(enr);
      }

      const kyc = await getKycData(enr.investor_id);
      setKycData(kyc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [token, enrollment]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <EnrollmentContext.Provider value={{ enrollment, kycData, loading, error, refresh }}>
      {children}
    </EnrollmentContext.Provider>
  );
}
