import { Investor, PromotionInvestor, Promotion, PromotionSettings, KycData, Document } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (API_KEY) {
    headers.set("X-API-Key", API_KEY);
  }
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getEnrollmentByToken(token: string): Promise<PromotionInvestor | null> {
  const enrollments = await apiFetch<PromotionInvestor[]>(`/promotion-investors/?token=${token}`);
  return enrollments.length > 0 ? enrollments[0] : null;
}

export async function getEnrollment(enrollmentId: string): Promise<PromotionInvestor> {
  return apiFetch<PromotionInvestor>(`/promotion-investors/${enrollmentId}`);
}

export async function uploadDocs(investorId: string, enrollmentId: string, files: File[]): Promise<{ status: string }> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return apiFetch<{ status: string }>(`/kyc/upload-docs/${investorId}?enrollment_id=${enrollmentId}`, {
    method: "POST",
    body: formData,
  });
}

export async function pollKycData(
  investorId: string,
  enrollmentId: string,
  { intervalMs = 3000, maxAttempts = 120 } = {}
): Promise<KycData> {
  for (let i = 0; i < maxAttempts; i++) {
    const data = await getKycData(investorId);
    if (data) return data;

    // Check if processing failed so we can stop early
    try {
      const enrollment = await apiFetch<PromotionInvestor>(`/promotion-investors/${enrollmentId}`);
      if (enrollment.status === "processing_failed") {
        throw new Error("Error al procesar los documentos. Por favor, inténtelo de nuevo o contacte con soporte.");
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Error al procesar")) throw err;
      // If enrollment fetch fails, continue polling
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("El procesamiento está tardando más de lo esperado. Recargue la página para ver si sus datos están listos.");
}

export async function getKycData(investorId: string): Promise<KycData | null> {
  try {
    return await apiFetch<KycData>(`/kyc/kyc-data/${investorId}`);
  } catch {
    return null;
  }
}

export async function confirmKycData(
  investorId: string,
  enrollmentId: string,
  extractedJson?: Record<string, unknown>
): Promise<KycData> {
  return apiFetch<KycData>(`/kyc/kyc-data/${investorId}/confirm?enrollment_id=${enrollmentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(extractedJson ?? null),
  });
}

export async function getDocuments(investorId: string): Promise<Document[]> {
  return apiFetch<Document[]>(`/documents/${investorId}`);
}

export async function downloadDocument(investorId: string, documentId: string, filename: string): Promise<void> {
  const headers: HeadersInit = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(`${API_BASE}/documents/${investorId}/download/${documentId}`, { headers });
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Promotions ---

export async function getPromotions(): Promise<Promotion[]> {
  return apiFetch<Promotion[]>("/promotions/");
}

export async function getPromotion(promotionId: string): Promise<Promotion> {
  return apiFetch<Promotion>(`/promotions/${promotionId}`);
}

export async function createPromotion(data: {
  name: string;
  description?: string;
}): Promise<Promotion> {
  return apiFetch<Promotion>("/promotions/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updatePromotion(
  promotionId: string,
  data: { name?: string; description?: string; settings?: PromotionSettings }
): Promise<Promotion> {
  return apiFetch<Promotion>(`/promotions/${promotionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// --- Enrollments (admin) ---

export async function getEnrollmentsByPromotion(
  promotionId: string
): Promise<PromotionInvestor[]> {
  return apiFetch<PromotionInvestor[]>(`/promotion-investors/?promotion_id=${promotionId}`);
}

export async function createEnrollment(data: {
  name: string;
  email: string;
  promotion_id: string;
  investment_amount?: number;
  ownership_pct?: number;
}): Promise<PromotionInvestor> {
  return apiFetch<PromotionInvestor>("/promotion-investors/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteEnrollment(enrollmentId: string): Promise<void> {
  const headers: HeadersInit = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(`${API_BASE}/promotion-investors/${enrollmentId}`, { method: "DELETE", headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
}

// --- Protocol ---

export async function generateProtocol(enrollmentId: string): Promise<Blob> {
  const headers: HeadersInit = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(
    `${API_BASE}/protocol/generate/${enrollmentId}`,
    { method: "POST", headers }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.blob();
}
