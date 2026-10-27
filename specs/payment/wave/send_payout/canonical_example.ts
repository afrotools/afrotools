/**
 * @provider Wave
 * @capability send_payout
 * @atss 1.1
 * @capability_type synchronous
 */

import { randomUUID } from "crypto";

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface SendPayoutInput {
  currency: string;
  receive_amount: string;
  mobile: string;
  name?: string;
  national_id?: string;
  client_reference?: string;
  payment_reason?: string;
}

interface PayoutResponse {
  id: string;
  status: "processing" | "succeeded" | "failed" | "reversed";
  currency: string;
  receive_amount: string;
  fee: string;
  mobile: string;
  name?: string;
  national_id?: string;
  client_reference?: string;
  payment_reason?: string;
  aggregated_merchant_id?: string;
  timestamp: string;
  payout_error?: { error_code: string; error_message?: string };
}

interface WaveError {
  code: string;
  message: string;
}

export async function sendPayout(
  input: SendPayoutInput,
  idempotencyKey: string = randomUUID()
): Promise<PayoutResponse> {
  const response = await fetch("https://api.wave.com/v1/payout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVE_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<PayoutResponse>;
}

/*
Usage example :

// Generate and store the idempotency key BEFORE the call — on retry, reuse the same key.
const idempotencyKey = randomUUID();
await db.payouts.create({ idempotency_key: idempotencyKey, status: "pending", mobile: "+221700000000" });

let payout: PayoutResponse;
try {
  payout = await sendPayout(
    {
      currency: "XOF",
      receive_amount: "5000",   // string, without decimals
      mobile: "+221700000000",  // E.164 format
      client_reference: "withdrawal_456",
      payment_reason: "Remboursement commande",
    },
    idempotencyKey
  );
} catch (err) {
  // Network error or 5xx: retry with the SAME idempotencyKey + exponential backoff
  // 4xx error (insufficient-funds, etc.): mark as failed permanently
  throw err;
}

if (payout.status === "succeeded") {
  await db.payouts.update({ idempotency_key: idempotencyKey }, { status: "succeeded", payout_id: payout.id });
} else if (payout.status === "processing") {
  // Not final yet — monitor via GET /v1/payout/{id}
  await db.payouts.update({ idempotency_key: idempotencyKey }, { status: "processing", payout_id: payout.id });
} else {
  // failed
  await db.payouts.update({ idempotency_key: idempotencyKey }, { status: "failed", error: payout.payout_error?.error_code });
}

// IMPORTANT: never mark a payout in "processing" status as "failed".
// The user could retry, causing a duplicate if the payout ends up succeeding.
*/
