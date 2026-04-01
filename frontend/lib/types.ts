export type InvestorStatus = "pending" | "processing" | "processing_failed" | "docs_uploaded" | "data_confirmed" | "complete";

export type DocType = "escritura_constitucion" | "nombramiento" | "poderes" | "otro";

export interface PromotionSettings {
  total_investment: number | null;
  total_shares: number | null;
  first_disbursement_pct: number | null;
  second_disbursement_pct: number | null;
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  settings: PromotionSettings | null;
  created_at: string;
}

export interface Investor {
  id: string;
  name: string;
  email: string;
  cif: string;
  created_at: string;
}

export interface PromotionInvestor {
  id: string;
  promotion_id: string;
  investor_id: string;
  investment_amount: number | null;
  ownership_pct: number | null;
  status: InvestorStatus;
  token: string;
  created_at: string;
  investor_name: string;
  investor_email: string;
  investor_cif: string;
}

export interface Document {
  id: string;
  investor_id: string;
  filename: string;
  storage_path: string;
  doc_type: DocType;
  uploaded_at: string;
}

export interface KycData {
  id: string;
  investor_id: string;
  extracted_json: Record<string, unknown>;
  confirmed: boolean;
  confirmed_at: string | null;
}
