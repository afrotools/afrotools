/**
 * @provider Cartflox
 * @capability send_mobile_money_transfer
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type SendMobileMoneyTransferInput = {
  amount: number;
  country: "CI" | "SN" | "BJ" | "BF" | "TG" | "ML" | "NE" | "GN" | "CM" | "GA" | "CG" | "CD" | "GH" | "NG" | "KE" | "TZ" | "UG" | "RW" | "ZM";
  operator: string;
  phone: string;
  currency?: string;
  recipient_name?: string;
  description?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
};

export type SendMobileMoneyTransferResponse = {
  id: string;
  reference: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  amount: number;
  currency: string;
  fee: number;
  country: string;
  operator: string;
  provider_operator?: string | null;
  phone: string;
  recipient_name?: string | null;
  description?: string | null;
  provider?: string | null;
  provider_reference?: string | null;
  failure?: {
    code: string | null;
    message: string | null;
  } | null;
  idempotency_key?: string | null;
  livemode: boolean;
  created: string;
  completed?: string | null;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function sendMobileMoneyTransfer(
  input: SendMobileMoneyTransferInput,
  // One key per order or transfer, reused unchanged on every retry of it.
  idempotencyKey?: string
): Promise<SendMobileMoneyTransferResponse> {
  const response = await fetch("https://cartflox.com/api/v1/transfers", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CARTFLOX_SECRET_KEY}`,
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as SendMobileMoneyTransferResponse;
}

/*
Usage example:

const transfer = await sendMobileMoneyTransfer(
  {
    amount: 50000,
    country: "CI",
    operator: "orange_money",
    phone: "+2250712345678",
    recipient_name: "Awa Koné",
    description: "September salary",
  },
  "salary-2026-09-awa",
);
// transfer.status is most often "processing": wait for transfer.succeeded or poll getTransfer.
*/
