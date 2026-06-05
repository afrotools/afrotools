/**
 * @provider Bictorys
 * @capability refund_transaction
 * @atss 1.0
 * @capability_type asynchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function refundTransaction(transactionId: string): Promise<void> {
  const response = await fetch(
    "https://api.bictorys.com/pay/v1/transactions/" + transactionId + "/refund",
    {
      method: "PUT",
      headers: {
        "X-API-Key": BICTORYS_SECRET_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  // HTTP 202 — refund accepted. No body returned.
  // Bictorys will fire a webhook (type: "refund", status: "SUCCEEDED") when processing completes.
}

/*
Usage example:

await refundTransaction("abd2053b-638d-4133-957e-3caf63e6b79c");
// Returns void — 202 means queued, not completed.
// Listen for the webhook_payment_completed event with type === "refund" and status === "SUCCEEDED"
// to confirm the refund was processed, or call verifyTransaction() and check status === "reversed".
*/
