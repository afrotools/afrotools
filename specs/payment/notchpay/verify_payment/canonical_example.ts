/**
 * @provider Notch Pay
 * @capability verify_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface NotchPayTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer: string;
  created_at: string;
}

interface VerifyPaymentResponse {
  status: string;
  message: string;
  code: number;
  transaction: NotchPayTransaction;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function verifyPayment(
  reference: string
): Promise<VerifyPaymentResponse> {
  const response = await fetch(
    `https://api.notchpay.co/payments/${reference}`,
    {
      method: "GET",
      headers: {
        Authorization: NOTCHPAY_PUBLIC_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<VerifyPaymentResponse>;
}

/*
Usage example:

const result = await verifyPayment("order_123");

if (result.transaction.status === "complete") {
  // Safe to fulfill the order
} else {
  // Do not fulfill — payment is pending, failed, or canceled
}

// Always call verifyPayment server-side before fulfilling an order.
// Never trust callback URL parameters alone — they can be tampered with.
*/
