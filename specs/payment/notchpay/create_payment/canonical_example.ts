/**
 * @provider Notch Pay
 * @capability create_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface CreatePaymentInput {
  amount: number;
  currency: string;
  email: string;
  phone?: string;
  description?: string;
  reference?: string;
  callback?: string;
}

interface NotchPayTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer: string;
  created_at: string;
}

interface CreatePaymentResponse {
  status: string;
  message: string;
  code: number;
  transaction: NotchPayTransaction;
  authorization_url: string;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResponse> {
  const response = await fetch("https://api.notchpay.co/payments", {
    method: "POST",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<CreatePaymentResponse>;
}

/*
Usage example:

const payment = await createPayment({
  amount: 5000,
  currency: "XAF",
  email: "customer@example.com",
  description: "Order #123",
  reference: "order_123",
  callback: "https://myapp.com/payment/callback",
});

// Redirect the user to complete the payment
// window.location.href = payment.authorization_url;

// Store payment.transaction.reference before redirecting —
// you need it to call verify_payment server-side.
// Never fulfill an order based on the callback redirect alone.
*/
