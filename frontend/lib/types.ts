export type InvestorStatus = "pending" | "docs_uploaded" | "data_confirmed" | "complete";

export type DocType = "escritura_constitucion" | "nombramiento" | "poderes" | "otro";

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Investor {
  id: string;
  promotion_id: string;
  name: string;
  email: string;
  investment_amount: number | null;
  ownership_pct: number | null;
  status: InvestorStatus;
  token: string;
  created_at: string;
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
