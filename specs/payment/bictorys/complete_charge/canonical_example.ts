/**
 * @provider Bictorys
 * @capability complete_charge
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CompleteChargeInput {
  country?: string;
  merchantReference?: string;
  successRedirectUrl?: string;
  errorRedirectUrl?: string;
}

interface ConfirmationLinkObject {
  transactionId: string;
  redirectUrl?: string;
  type: "MobilePaymentObject" | "CardPaymentObject";
  link?: string;
  qrCode?: string;
  message?: string;
  state?: "AWAIT_3DS" | "PURCHASED" | "CAPTURED" | "AUTHORIZED" | "FAILED" | "DECLINED";
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function completeCharge(
  chargeId: string,
  opToken: string,
  input: CompleteChargeInput = {},
  paymentType?: string
): Promise<ConfirmationLinkObject> {
  const baseUrl = "https://api.bictorys.com/pay/v1/charges/" + chargeId;
  const url = paymentType ? baseUrl + "?payment_type=" + paymentType : baseUrl;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      "X-API-Key": BICTORYS_SECRET_KEY!,
      "Op-Token": opToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<ConfirmationLinkObject>;
}

/*
Usage example — second step after create_charge returned HTTP 202:

// Step 1: create_charge (no payment_type → HTTP 202)
// const checkout = await createCharge({ amount: 5000, currency: "XOF", ... });
// Store checkout.chargeId and checkout.opToken before redirecting.
// Redirect customer to checkout.link (Bictorys hosted page).

// Step 2: After customer picks payment method on Bictorys page, complete the charge:
const confirmation = await completeCharge(
  "fbd2053b-638d-4133-957e-3caf63e6b79c", // chargeId from create_charge 202 response
  "2fEAW4v860oMFIDNs2c1NMHgPq6btk3",      // opToken from create_charge 202 response
  { successRedirectUrl: "https://myapp.com/payment/success" },
  "orange_money"                           // payment_type if known
);

// Redirect customer to confirmation.redirectUrl
// Verify server-side via verifyTransaction(confirmation.transactionId) before fulfilling.
*/
