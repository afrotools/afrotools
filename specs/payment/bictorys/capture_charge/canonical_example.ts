/**
 * @provider Bictorys
 * @capability capture_charge
 * @atss 1.0
 * @capability_type asynchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CaptureInput {
  amount: number;
  currency: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function captureCharge(
  transactionId: string,
  input: CaptureInput
): Promise<void> {
  const response = await fetch(
    "https://api.bictorys.com/pay/v1/captures?transactionId=" + transactionId,
    {
      method: "POST",
      headers: {
        "X-API-Key": BICTORYS_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  // HTTP 202 — capture queued. No body returned.
  // Call verifyTransaction(transactionId) to confirm status === "succeeded" when processing completes.
}

/*
Usage example — full capture of a pre-authorized transaction:

// After create_charge with authorization: true, store the transactionId.
// The transaction status will be "authorized".

await captureCharge("abd2053b-638d-4133-957e-3caf63e6b79c", {
  amount: 50000,  // must match the original authorized amount for full capture
  currency: "XOF",
});
// Returns void — 202 means queued, not yet complete.
// Monitor via webhook or call verifyTransaction to check for status "succeeded".

---

Partial capture example (charge 30 000 of 50 000 authorized):

await captureCharge("abd2053b-638d-4133-957e-3caf63e6b79c", {
  amount: 30000,  // less than the authorized amount
  currency: "XOF",
});
*/
