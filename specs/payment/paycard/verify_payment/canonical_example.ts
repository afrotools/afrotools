/**
 * @provider Paycard
 * @capability verify_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const PAYCARD_API_KEY = process.env.PAYCARD_API_KEY;
if (!PAYCARD_API_KEY) throw new Error("Missing env: PAYCARD_API_KEY");

interface VerifyPaymentResponse {
  code: number;
  "paycard-transaction-date": string;
  "paycard-payment-method": string;
  "paycard-amount": string;
  "paycard-formatted-amount": string;
}

interface PaycardError {
  code: number;
  error_message: string;
}

export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResponse> {
  const url = new URL("https://mapaycard.com/epay/verify/");
  url.searchParams.set("c", PAYCARD_API_KEY!); // guarded at module level above
  url.searchParams.set("ref", reference);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data: VerifyPaymentResponse | PaycardError = await response.json();

  if ((data as PaycardError).code !== 0) {
    const err = data as PaycardError;
    throw new Error(`Paycard verify error ${err.code}: ${err.error_message}`);
  }

  return data as VerifyPaymentResponse;
}

/*
Usage example:

// After receiving the webhook or redirect, verify server-side before fulfilling:
const status = await verifyPayment("2312-Z1LISQM9IY");

if (status.code === 0) {
  // Payment confirmed — safe to fulfill the order
  console.log("Paid:", status["paycard-formatted-amount"]);
  console.log("Method:", status["paycard-payment-method"]);
} else {
  // Payment pending or failed — do not fulfill
}
*/
