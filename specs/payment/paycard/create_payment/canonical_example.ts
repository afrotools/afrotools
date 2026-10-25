/**
 * @provider Paycard
 * @capability create_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const PAYCARD_API_KEY = process.env.PAYCARD_API_KEY;
if (!PAYCARD_API_KEY) throw new Error("Missing env: PAYCARD_API_KEY");

interface CreatePaymentInput {
  amount: number;
  description?: string;
  reference?: string;
  callbackUrl?: string;
  autoRedirect?: boolean;
  redirectWithGet?: boolean;
  paymentMethod?: "PAYCARD" | "CREDIT_CARD" | "ORANGE_MONEY" | "MOMO";
}

interface CreatePaymentResponse {
  code: number;
  error_message: string;
  operation_reference: string;
  payment_amount: number;
  payment_amount_formatted: string;
  payment_description: string;
  payment_url: string;
}

interface PaycardError {
  code: number;
  error_message: string;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResponse> {
  const body: Record<string, string> = {
    c: PAYCARD_API_KEY!, // guarded at module level above
    "paycard-amount": String(input.amount),
  };

  if (input.description) body["paycard-description"] = input.description;
  if (input.reference) body["paycard-operation-reference"] = input.reference;
  if (input.callbackUrl) body["paycard-callback-url"] = input.callbackUrl;
  if (input.autoRedirect !== undefined)
    body["paycard-auto-redirect"] = input.autoRedirect ? "on" : "off";
  if (input.redirectWithGet !== undefined)
    body["paycard-redirect-with-get"] = input.redirectWithGet ? "on" : "off";

  if (input.paymentMethod === "PAYCARD") body["paycard-jump-to-paycard"] = "on";
  if (input.paymentMethod === "CREDIT_CARD") body["paycard-jump-to-cc"] = "on";
  if (input.paymentMethod === "ORANGE_MONEY") body["paycard-jump-to-om"] = "on";
  if (input.paymentMethod === "MOMO") body["paycard-jump-to-momo"] = "on";

  const response = await fetch("https://mapaycard.com/epay/create/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: CreatePaymentResponse | PaycardError = await response.json();

  if ((data as PaycardError).code !== 0) {
    const err = data as PaycardError;
    throw new Error(`Paycard error ${err.code}: ${err.error_message}`);
  }

  return data as CreatePaymentResponse;
}

/*
Usage example:

const payment = await createPayment({
  amount: 100000,
  description: "Order #123",
  reference: "order_123",
  callbackUrl: "https://myapp.com/payment/callback",
  autoRedirect: true,
  redirectWithGet: true,
  paymentMethod: "ORANGE_MONEY",
});

// Redirect the user to the payment page
// window.location.href = payment.payment_url;

// Store payment.operation_reference in your database
// before redirecting — you need it to call verify_payment server-side.
// Never fulfill an order based on the callback URL alone.
*/
