const ESCROW_API = process.env.ESCROW_API_URL || "http://localhost:3000";

// ─── Types ───────────────────────────────────────────────────

export interface CreateEscrowParams {
  pattern: string;
  amount: number;
  lock_time?: number;
  fee_percent?: number;
}

export interface EscrowResponse {
  id: string;
  mode: string;
  status: string;
  funding_address: string;
  escrow_amount: number;
  pattern: string;
  buyer_pk: string;
  seller_pk: string;
  arbitrator_pk?: string;
  owner_pk?: string;
  fee_pk?: string;
  seller_amount: number;
  fee_amount: number;
  redeem_script_hex: string;
}

export interface StatusResponse {
  id: string;
  status: string;
  funding_address: string;
  escrow_amount: number;
  pattern: string;
  buyer_pk: string;
  seller_pk: string;
  utxo_amount?: number;
  current_daa?: number;
  funding_tx_id?: string;
  release_tx_id?: string;
  refund_tx_id?: string;
  dispute_tx_id?: string;
  escape_tx_id?: string;
  expires_at_daa?: number;
  funding_confirmations?: number;
  funding_confirmed: boolean;
  settlement_confirmed: boolean;
}

export interface TxResponse {
  tx_id: string;
  status: string;
  winner?: string;
}

export interface ErrorResponse {
  error: string;
}

// ─── API Client ──────────────────────────────────────────────

async function apiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${ESCROW_API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as ErrorResponse).error || `API error: ${res.status}`);
  }
  return data as T;
}

export async function createEscrow(params: CreateEscrowParams): Promise<EscrowResponse> {
  return apiCall("/escrow", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function getEscrowStatus(id: string): Promise<StatusResponse> {
  return apiCall(`/escrow/${id}`);
}

export async function fundEscrow(id: string, fee = 5000): Promise<TxResponse> {
  return apiCall(`/escrow/${id}/fund`, {
    method: "POST",
    body: JSON.stringify({ fee }),
  });
}

export async function releaseEscrow(id: string, fee = 5000): Promise<TxResponse> {
  return apiCall(`/escrow/${id}/release`, {
    method: "POST",
    body: JSON.stringify({ fee }),
  });
}

export async function refundEscrow(id: string, fee = 5000): Promise<TxResponse> {
  return apiCall(`/escrow/${id}/refund`, {
    method: "POST",
    body: JSON.stringify({ fee }),
  });
}

export async function disputeEscrow(
  id: string,
  winner: "buyer" | "seller",
  fee = 5000
): Promise<TxResponse> {
  return apiCall(`/escrow/${id}/dispute`, {
    method: "POST",
    body: JSON.stringify({ winner, fee }),
  });
}
