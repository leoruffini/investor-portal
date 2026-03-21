import { Investor, KycData, Document } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
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

export async function confirmKycData(investorId: string): Promise<KycData> {
  return apiFetch<KycData>(`/kyc/kyc-data/${investorId}/confirm`, {
    method: "PATCH",
  });
}

export async function getDocuments(investorId: string): Promise<Document[]> {
  return apiFetch<Document[]>(`/documents/${investorId}`);
}
