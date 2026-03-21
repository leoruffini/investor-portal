"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Investor, KycData } from "@/lib/types";
import { getInvestorByToken, getKycData, getInvestor } from "@/lib/api";

interface InvestorContextValue {
  investor: Investor | null;
  kycData: KycData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const InvestorContext = createContext<InvestorContextValue>({
  investor: null,
  kycData: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function useInvestor() {
  return useContext(InvestorContext);
}

export function InvestorProvider({
  token,
  children,
}: {
  token: string;
  children: React.ReactNode;
}) {
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [kycData, setKycData] = useState<KycData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let inv = investor;
      if (!inv) {
        inv = await getInvestorByToken(token);
        if (!inv) {
          setError("Enlace no válido. Contacte con Provalix.");
          return;
        }
        setInvestor(inv);
      } else {
        inv = await getInvestor(inv.id);
        setInvestor(inv);
      }

      const kyc = await getKycData(inv.id);
      setKycData(kyc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [token, investor]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <InvestorContext.Provider value={{ investor, kycData, loading, error, refresh }}>
      {children}
    </InvestorContext.Provider>
  );
}
