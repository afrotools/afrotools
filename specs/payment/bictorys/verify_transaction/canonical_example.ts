/**
 * @provider Bictorys
 * @capability verify_transaction
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface TransactionResponse {
  id: string;
  merchantId: string;
  customerId?: string;
  type: "payment" | "transfer" | "refund" | "settlement";
  pspName: "wave_money" | "orange_money" | "maxit" | "mtn_money" | "free_money" | "moov" | "mobicash" | "togocell" | "bictorys" | "card";
  paymentMeans?: string;
  paymentChannel?: "Terminal" | "Online";
  amount: number;
  merchantFees?: number;
  customerFees?: number;
  currency: string;
  paymentReference?: string;
  merchantReference?: string;
  orderType?: "flat" | "order" | "invoice" | "paymentlink";
  orderId?: string;
  status: "succeeded" | "failed" | "cancelled" | "pending" | "processing" | "reversed" | "authorized";
  timestamp: string;
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
        "X-API-Key": BICTORYS_SECRET_KEY!,
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

if (transaction.status === "succeeded") {
  // Safe to fulfill — funds are captured
  await fulfillOrder(transaction.paymentReference, transaction.amount, transaction.currency);
} else if (transaction.status === "authorized") {
  // Funds reserved but not captured — capture separately if needed
} else {
  // Payment not complete; log and monitor
  console.warn("Payment not succeeded:", transaction.status, transaction.id);
}
*/
