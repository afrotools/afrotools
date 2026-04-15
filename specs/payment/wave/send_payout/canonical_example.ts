/**
 * @provider Wave
 * @capability send_payout
 * @atss 1.0
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
  client_reference?: string;
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

// Générer et stocker l'idempotency key AVANT l'appel — en cas de retry, réutiliser la même key.
const idempotencyKey = randomUUID();
await db.payouts.create({ idempotency_key: idempotencyKey, status: "pending", mobile: "+221700000000" });

let payout: PayoutResponse;
try {
  payout = await sendPayout(
    {
      currency: "XOF",
      receive_amount: "5000",   // string, sans décimales
      mobile: "+221700000000",  // format E.164
      client_reference: "withdrawal_456",
      payment_reason: "Remboursement commande",
    },
    idempotencyKey
  );
} catch (err) {
  // Erreur réseau ou 5xx : retenter avec le MÊME idempotencyKey + backoff exponentiel
  // Erreur 4xx (insufficient-funds, etc.) : marquer comme failed définitivement
  throw err;
}

if (payout.status === "succeeded") {
  await db.payouts.update({ idempotency_key: idempotencyKey }, { status: "succeeded", payout_id: payout.id });
} else if (payout.status === "processing") {
  // Pas encore définitif — surveiller via GET /v1/payout/{id}
  await db.payouts.update({ idempotency_key: idempotencyKey }, { status: "processing", payout_id: payout.id });
} else {
  // failed
  await db.payouts.update({ idempotency_key: idempotencyKey }, { status: "failed", error: payout.payout_error?.error_code });
}

// IMPORTANT : ne jamais marquer "failed" un payout en status "processing".
// L'utilisateur pourrait retenter, causant un doublon si le payout finit par réussir.
*/
