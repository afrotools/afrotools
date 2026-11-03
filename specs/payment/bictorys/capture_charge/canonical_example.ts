/**
 * @provider Bictorys
 * @capability capture_charge
 * @atss 1.1
 * @capability_type synchronous
 */

// Bictorys does not say which key this endpoint takes (see open_questions): this example sends the
// private key, server-side only.
const BICTORYS_PRIVATE_KEY = process.env.BICTORYS_PRIVATE_KEY;
if (!BICTORYS_PRIVATE_KEY) throw new Error("Missing env: BICTORYS_PRIVATE_KEY");

interface CaptureChargeInput {
  // Must not exceed the authorized amount; less is a partial capture.
  amount: number;
  currency: string;
}

interface BictorysError {
  status?: string;
  title?: string;
  details?: string;
}

// Bictorys types transactionId as a uuid; it goes in the query string.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Resolves on HTTP 202 ("The amount has been captured successfully"), which has no documented body. */
export async function captureCharge(transactionId: string, input: CaptureChargeInput): Promise<void> {
  if (!UUID.test(transactionId)) throw new Error("Invalid Bictorys transactionId: " + JSON.stringify(transactionId));
  const response = await fetch(
    "https://api.bictorys.com/pay/v1/captures?transactionId=" + transactionId,
    {
      method: "POST",
      headers: {
        "X-API-Key": BICTORYS_PRIVATE_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (response.status === 202) return;

  // 401 and 403 have no documented body; 400 and 500 return { status?, title, details }.
  const text = await response.text();
  let error: BictorysError = {};
  try {
    error = JSON.parse(text) as BictorysError;
  } catch {
    // not JSON
  }
  throw new Error("Bictorys capture error " + response.status + ": " + (error.details ?? error.title ?? text));
}

/*
Usage example — the charge was created with authorization: true (create_charge), and
verify_transaction (or the webhook) reports status "authorized". Capture from your server, with the
transactionId you stored at create_charge time, never one taken from the browser:

await captureCharge("abd2053b-638d-4133-957e-3caf63e6b79c", { amount: 45000, currency: "XOF" });

// No idempotency header is documented: if this call times out, check the transaction with
// verify_transaction before retrying rather than capturing again blindly.
*/
