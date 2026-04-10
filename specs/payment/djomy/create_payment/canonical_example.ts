/**
 * @provider Djomy
 * @capability create_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const DJOMY_CLIENT_ID = process.env.DJOMY_CLIENT_ID;
const DJOMY_CLIENT_SECRET = process.env.DJOMY_CLIENT_SECRET;
if (!DJOMY_CLIENT_ID) throw new Error("Missing env: DJOMY_CLIENT_ID");
if (!DJOMY_CLIENT_SECRET) throw new Error("Missing env: DJOMY_CLIENT_SECRET");

const DJOMY_BASE_URL = "https://sandbox-api.djomy.africa";

type PaymentMethod = "OM" | "MOMO" | "KULU" | "SOUTRA_MONEY" | "PAYCARD" | "YMO";

interface CreatePaymentInput {
  paymentMethod: PaymentMethod;
  payerIdentifier: string;
  amount: number;
  countryCode: string;
  description?: string;
  merchantPaymentReference?: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface CreatedPaymentData {
  transactionId: string;
  status: "CREATED" | "PENDING" | "FAILED" | "SUCCESS" | "AUTHORIZED" | "CAPTURED";
  paidAmount: number;
  paymentMethod: string;
  merchantPaymentReference: string;
  createdAt: string;
  paymentUrl: string;
  allowedPaymentMethods: string[];
  metadata: Record<string, unknown>;
}

interface DjomyResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: { code: number; message: string; details: string; fieldsErrors: string[] } | null;
  timestamp: string;
  status: number;
}

async function computeHmacHex(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getAccessToken(): Promise<string> {
  const signature = await computeHmacHex(DJOMY_CLIENT_ID!, DJOMY_CLIENT_SECRET!);
  const response = await fetch(`${DJOMY_BASE_URL}/v1/auth`, {
    method: "POST",
    headers: {
      "X-API-KEY": `${DJOMY_CLIENT_ID}:${signature}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Djomy auth failed: ${response.status}`);
  }
  const result = (await response.json()) as DjomyResponse<{ accessToken: string; tokenType: string; expiresIn: number }>;
  if (!result.success) {
    throw new Error(`Djomy auth error: ${result.message}`);
  }
  return result.data.accessToken;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatedPaymentData> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${DJOMY_BASE_URL}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentMethod: input.paymentMethod,
      payerIdentifier: input.payerIdentifier,
      amount: input.amount,
      countryCode: input.countryCode,
      ...(input.description && { description: input.description }),
      ...(input.merchantPaymentReference && { merchantPaymentReference: input.merchantPaymentReference }),
      ...(input.returnUrl && { returnUrl: input.returnUrl }),
      ...(input.cancelUrl && { cancelUrl: input.cancelUrl }),
      ...(input.metadata && { metadata: input.metadata }),
    }),
  });

  const result = (await response.json()) as DjomyResponse<CreatedPaymentData>;

  if (!result.success) {
    throw new Error(
      `Djomy create_payment error: ${result.error?.message ?? result.message}`
    );
  }

  return result.data;
}

/*
Usage example:

const payment = await createPayment({
  paymentMethod: "OM",
  payerIdentifier: "00224623707722",
  amount: 100000,
  countryCode: "GN",
  description: "Order #ORD-456",
  merchantPaymentReference: "ORD-456",
  metadata: { order_id: "ORD-456", customer_id: "42" },
});

// payment.transactionId — store this immediately in your database
// payment.status will be "PENDING" for OM/MOMO direct payments

// For OM/MOMO: the payer receives an OTP from their operator.
// Call confirm_otp(payment.transactionId, otpFromPayer) to finalize the payment.
// Always verify server-side with verify_payment before fulfilling the order.
*/
