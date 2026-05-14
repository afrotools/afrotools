/**
 * @provider KadevPay
 * @capability verify_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const KADEVPAY_SECRET_KEY = process.env.KADEVPAY_SECRET_KEY;
if (!KADEVPAY_SECRET_KEY) throw new Error("Missing env: KADEVPAY_SECRET_KEY");

interface VerifyPaymentCustomer {
  full_name?: string;
  email?: string;
}

interface VerifyPaymentData {
  reference: string;
  status: "paid" | "pending" | "failed";
  amount: number;
  currency: "XOF";
  customer?: VerifyPaymentCustomer;
  paid_at?: string;
}

interface VerifyPaymentResponse {
  status: string;
  mode?: "test" | "live";
  data: VerifyPaymentData;
}

interface KadevPayError {
  message: string;
}

export async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  const response = await fetch(
    `https://pay.kadev.ci/api/v1/transactions/verify/${reference}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${KADEVPAY_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error: KadevPayError = await response.json();
    throw new Error(`KadevPay verify error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<VerifyPaymentResponse>;
}

/*
Usage example:

// After receiving the reference from the checkout onSuccess callback or callback_url redirect:
const result = await verifyPayment("KDV-1775413916000");

if (result.status === "success" && result.data.status === "paid") {
  // Safe to fulfill the order
  console.log("Payment confirmed:", result.data.amount, result.data.currency);
  console.log("Customer:", result.data.customer?.full_name);
} else {
  // Do not fulfill — payment is still pending, failed, or the reference is invalid
  console.log("Payment not confirmed:", result.status, result.data.status);
}
*/
