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
  id: string;
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
    "https://api.bictorys.com/pay/v1/transactions/" + transactionId + "/status",
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
const transaction = await verifyTransaction("abd2053b-638d-4133-957e-3caf63e6b79c");

// Bictorys' integration guide: "authorized" (card pre-capture) → "Traiter comme succeeded".
// "authorized" funds are reserved, not yet captured — whether a capture is needed
// before fulfilling is an open question on this spec.
if (transaction.status === "succeeded" || transaction.status === "authorized") {
  await fulfillOrder(transaction.paymentReference, transaction.amount, transaction.currency);
} else {
  // Payment not complete; log and monitor
  console.warn("Payment not succeeded:", transaction.status, transaction.id);
}
*/
