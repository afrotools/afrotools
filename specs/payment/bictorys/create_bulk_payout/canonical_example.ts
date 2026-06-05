/**
 * @provider Bictorys
 * @capability create_bulk_payout
 * @atss 1.0
 * @capability_type asynchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface PayoutRecipient {
  amount: number;
  currency: string;
  country?: string;
  customerId?: string;
  customerObject?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    country: string;
  };
  transactionType?: "transfer" | "refund" | "payment" | "settlement";
  paymentReason?: string;
  merchantReference?: string;
}

interface BulkPayoutResponse {
  id?: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createBulkPayout(
  recipients: PayoutRecipient[],
  paymentType: string,
  countryCode: string,
  options: { batchReference?: string; idempotencyKey?: string } = {}
): Promise<BulkPayoutResponse> {
  const url = "https://api.bictorys.com/pay/v1/batch-payout"
    + "?payment_type=" + paymentType
    + "&country_code=" + countryCode;

  const headers: Record<string, string> = {
    "X-API-Key": BICTORYS_SECRET_KEY!,
    "Content-Type": "application/json",
  };
  if (options.batchReference) headers["X-Batch-Reference"] = options.batchReference;
  if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(recipients),
  });

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  // HTTP 202 — batch accepted. Check body for batch id if present.
  const text = await response.text();
  return text ? (JSON.parse(text) as BulkPayoutResponse) : {};
}

/*
Usage example — pay 3 agents via Wave Money in Senegal:

const result = await createBulkPayout(
  [
    {
      amount: 50000,
      currency: "XOF",
      country: "SN",
      customerObject: { name: "Ibrahima Diop", phone: "+221770001234", country: "SN" },
      paymentReason: "Commission agent — juin 2026",
      merchantReference: "AGT-001-2026-06",
    },
    {
      amount: 35000,
      currency: "XOF",
      country: "SN",
      customerObject: { name: "Rokhaya Fall", phone: "+221781005678", country: "SN" },
      paymentReason: "Commission agent — juin 2026",
      merchantReference: "AGT-002-2026-06",
    },
  ],
  "wave_money",
  "SN",
  { batchReference: "BATCH-2026-06-AGENTS", idempotencyKey: "c0ffeec0-ffee-c0ff-eec0-ffeec0ffeec0" }
);

// HTTP 202 — payouts are queued, not yet processed.
// Monitor individual payout results via webhook events (type: "transfer", status: "SUCCEEDED"/"FAILED").
*/
