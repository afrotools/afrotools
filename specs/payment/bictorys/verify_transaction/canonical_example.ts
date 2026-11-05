/**
 * @provider Bictorys
 * @capability verify_transaction
 * @atss 1.1
 * @capability_type synchronous
 */

// Public key, as Bictorys' integration guide prescribes for the status check.
const BICTORYS_API_KEY = process.env.BICTORYS_API_KEY;
if (!BICTORYS_API_KEY) throw new Error("Missing env: BICTORYS_API_KEY");

interface TransactionResponse {
  // Only id and status are guaranteed. Bictorys sandbox is known to return just
  // these two fields even for a fully completed ("succeeded") transaction —
  // every other field below may be absent, not just when pending.
  // id was null on an unpaid sandbox charge (2026-10-29, afrotools issue #175):
  // use the id you passed in, not this field.
  id: string | null;
  status: "succeeded" | "failed" | "cancelled" | "pending" | "processing" | "reversed" | "authorized";
  merchantId?: string;
  customerId?: string;
  type?: "payment" | "transfer" | "refund" | "settlement";
  pspName?: "wave_money" | "orange_money" | "maxit" | "mtn_money" | "free_money" | "moov" | "mobicash" | "togocell" | "bictorys" | "card";
  paymentMeans?: string;
  paymentChannel?: "Terminal" | "Online";
  amount?: number;
  merchantFees?: number;
  customerFees?: number;
  currency?: string;
  paymentReference?: string;
  merchantReference?: string;
  orderType?: "flat" | "order" | "invoice" | "paymentlink";
  orderId?: string;
  timestamp?: string;
  customerObject?: {
    name?: string;
    email?: string;
    phone?: number;
    country?: string;
  };
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function verifyTransaction(transactionId: string): Promise<TransactionResponse> {
  const response = await fetch(
    "https://api.bictorys.com/pay/v1/transactions/" + encodeURIComponent(transactionId) + "/status",
    {
      method: "GET",
      headers: {
        "X-API-Key": BICTORYS_API_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<TransactionResponse>;
}

/*
Usage example:

// Call after receiving a redirect callback or webhook event.
// create_charge returns it as transactionId (HTTP 201) or chargeId (HTTP 202)
const transactionId = "abd2053b-638d-4133-957e-3caf63e6b79c";
const transaction = await verifyTransaction(transactionId);

if (transaction.status === "succeeded") {
  // On success this response carries no amount and no timestamp (see the "succeeded" gotcha), so
  // there is nothing to read them from here: find the order in your own records by the id you
  // stored, and if you must check the amount paid, read it from GET /pay/v1/transactions
  // (match on paymentReference).
  await fulfillOrder(transactionId);
} else if (transaction.status === "authorized") {
  // Funds only reserved, not captured — do not fulfil until the spec's open question
  // (is a capture needed?) is resolved. See the "authorized" gotcha; to capture, see capture_charge.
} else {
  // Payment not complete; log and monitor
  console.warn("Payment not succeeded:", transaction.status, transactionId);
}
*/
