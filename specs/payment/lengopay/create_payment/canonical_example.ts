/**
 * @provider LengoPay
 * @capability create_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

interface CreatePaymentInput {
  amount: number;
  currency: string;
  returnUrl?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

interface CreatePaymentResponse {
  status: string;
  pay_id: string;
  payment_url: string;
}

interface LengoPayError {
  message: string;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResponse> {
  const body: Record<string, unknown> = {
    websiteid: LENGOPAY_WEBSITE_ID!,
    amount: input.amount,
    currency: input.currency,
  };

  if (input.returnUrl) body["return_url"] = input.returnUrl;
  if (input.callbackUrl) body["callback_url"] = input.callbackUrl;
  if (input.metadata) body["metadata"] = input.metadata;

  const response = await fetch("https://portal.lengopay.com/api/v1/payments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error: LengoPayError = await response.json();
    throw new Error(
      `LengoPay error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  return response.json() as Promise<CreatePaymentResponse>;
}

/*
Usage example:

const payment = await createPayment({
  amount: 100000,
  currency: "GNF",
  returnUrl: "https://myapp.com/confirmation",
  callbackUrl: "https://myapp.com/api/lengopay/callback",
  metadata: { orderId: "order_123" },
});

// Store payment.pay_id in your database before redirecting.
// It is required to call verify_payment later.
// window.location.href = payment.payment_url;
*/
