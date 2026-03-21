import { Investor, Promotion, KycData, Document } from "./types";

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

export async function getInvestorByToken(token: string): Promise<Investor | null> {
  const investors = await apiFetch<Investor[]>(`/investors/?token=${token}`);
  return investors.length > 0 ? investors[0] : null;
}

export async function getInvestor(investorId: string): Promise<Investor> {
  return apiFetch<Investor>(`/investors/${investorId}`);
}

export async function uploadDocs(investorId: string, files: File[]): Promise<KycData> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return apiFetch<KycData>(`/kyc/upload-docs/${investorId}`, {
    method: "POST",
    body: formData,
  });
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
  extractedJson?: Record<string, unknown>
): Promise<KycData> {
  return apiFetch<KycData>(`/kyc/kyc-data/${investorId}/confirm`, {
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
  data: { name?: string; description?: string }
): Promise<Promotion> {
  return apiFetch<Promotion>(`/promotions/${promotionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// --- Investors (admin) ---

export async function getInvestorsByPromotion(
  promotionId: string
): Promise<Investor[]> {
  return apiFetch<Investor[]>(`/investors/?promotion_id=${promotionId}`);
}

export async function createInvestor(data: {
  name: string;
  email: string;
  promotion_id: string;
  investment_amount?: number;
  ownership_pct?: number;
}): Promise<Investor> {
  return apiFetch<Investor>("/investors/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteInvestor(investorId: string): Promise<void> {
  const headers: HeadersInit = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  await fetch(`${API_BASE}/investors/${investorId}`, { method: "DELETE", headers });
}

// --- Protocol ---

export async function generateProtocol(investorId: string): Promise<Blob> {
  const headers: HeadersInit = {};
  if (API_KEY) headers["X-API-Key"] = API_KEY;
  const res = await fetch(
    `${API_BASE}/protocol/generate/${investorId}`,
    { method: "POST", headers }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  return res.blob();
}
