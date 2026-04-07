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
  error_message: string;
  reference: string;
  payment_amount: number;
  payment_amount_formatted: string;
  merchant_name: string;
  status: string;
  status_description: string | null;
  ecommerce_description: string | null;
  payment_method: string | null;
  payment_method_reference: string | null;
  payment_reference: string | null;
  payment_description: string | null;
  transaction_date: string | null;
}

interface PaycardError {
  code: number;
  error_message: string;
}

function isPaid(status: string | null | undefined): boolean {
  return status?.toLowerCase() === "success";
}

export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResponse> {
  const url = `https://mapaycard.com/epay/${PAYCARD_API_KEY!}/${reference}/status`;

  const response = await fetch(url, { method: "GET" });

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
const result = await verifyPayment("2604-PR700IACRG");

if (isPaid(result.status)) {
  // Payment confirmed — safe to fulfill the order
  console.log("Paid:", result.payment_amount_formatted);
  console.log("Method:", result.payment_method);
} else {
  // Payment pending (status: 'new') or unknown — do not fulfill
  console.log("Status:", result.status);
}
*/
