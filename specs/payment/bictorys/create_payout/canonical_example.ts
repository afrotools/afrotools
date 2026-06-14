/**
 * @provider Bictorys
 * @capability create_payout
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CustomerObject {
  name?: string;
  phone?: string;
  email?: string;
  country: string;
  locale?: string;
}

interface MerchantAuth {
  secretCode: number;
}

interface CreatePayoutInput {
  amount: number;
  currency: string;
  country?: string;
  customerId?: string;
  customerObject?: CustomerObject;
  transactionType: "payment" | "transfer" | "refund" | "settlement";
  paymentReason?: string;
  merchantReference?: string;
  merchant?: MerchantAuth;
}

interface CreatePayoutResponse {
  id: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createPayout(
  input: CreatePayoutInput,
  paymentType: string,
  idempotencyKey?: string
): Promise<CreatePayoutResponse> {
  const headers: Record<string, string> = {
    "X-API-Key": BICTORYS_SECRET_KEY!,
    "Content-Type": "application/json",
  };
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  const response = await fetch(
    "https://api.bictorys.com/pay/v1/payouts?payment_type=" + paymentType,
    {
      method: "POST",
      headers,
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<CreatePayoutResponse>;
}

/*
Usage example — send 5000 XOF via Wave Money to a recipient in Senegal:

const payout = await createPayout(
  {
    amount: 5000,
    currency: "XOF",
    country: "SN",
    customerObject: {
      name: "Fatou Sow",
      phone: "221770000000",
      country: "SN",
    },
    transactionType: "payment",
    paymentReason: "Remboursement commande #1234",
    merchant: { secretCode: 1234 }, // Operator-issued PIN registered in Bictorys dashboard; omit if not required
  },
  "wave_money",
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890" // idempotency key for safe retries
);

console.log("Payout created:", payout.id);
// Monitor the payout status via the Bictorys dashboard or a webhook.
*/
