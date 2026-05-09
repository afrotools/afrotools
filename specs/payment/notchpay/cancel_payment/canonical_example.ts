/**
 * @provider Notch Pay
 * @capability cancel_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface CancelPaymentResponse {
  status: string;
  message: string;
  code: number;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function cancelPayment(
  reference: string
): Promise<CancelPaymentResponse> {
  const response = await fetch(
    `https://api.notchpay.co/payments/${reference}`,
    {
      method: "DELETE",
      headers: {
        Authorization: NOTCHPAY_PUBLIC_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<CancelPaymentResponse>;
}

/*
Usage example:

await cancelPayment("order_123");

// Cancellation is irreversible — create a new payment if the user wants to retry.
// Only pending payments can be canceled; calling this on a completed payment returns 422.
*/
