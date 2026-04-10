/**
 * @provider Djomy
 * @capability create_payment_gateway
 * @atss 1.0
 * @capability_type synchronous
 */

const DJOMY_CLIENT_ID = process.env.DJOMY_CLIENT_ID;
const DJOMY_CLIENT_SECRET = process.env.DJOMY_CLIENT_SECRET;
if (!DJOMY_CLIENT_ID) throw new Error("Missing env: DJOMY_CLIENT_ID");
if (!DJOMY_CLIENT_SECRET) throw new Error("Missing env: DJOMY_CLIENT_SECRET");

const DJOMY_BASE_URL = "https://sandbox-api.djomy.africa";

type GatewayPaymentMethod = "OM" | "MOMO" | "SOUTRA_MONEY" | "PAYCARD" | "CARD";

interface CreatePaymentGatewayInput {
  amount: number;
  countryCode: string;
  payerNumber: string;
  allowedPaymentMethods?: GatewayPaymentMethod[];
  description?: string;
  merchantPaymentReference?: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, string | number | boolean>;
}

interface CreatedPaymentGatewayData {
  transactionId: string;
  status: "CREATED" | "PENDING" | "REDIRECTED" | "FAILED" | "SUCCESS" | "CAPTURED";
  paidAmount: number;
  paymentMethod: string;
  redirectUrl: string;
  allowedPaymentMethods: string[];
  createdAt: string;
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
  const result = (await response.json()) as DjomyResponse<{ accessToken: string }>;
  if (!result.success) {
    throw new Error(`Djomy auth error: ${result.message}`);
  }
  return result.data.accessToken;
}

export async function createPaymentGateway(
  input: CreatePaymentGatewayInput
): Promise<CreatedPaymentGatewayData> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${DJOMY_BASE_URL}/v1/payments/gateway`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amount,
      countryCode: input.countryCode,
      payerNumber: input.payerNumber,
      ...(input.allowedPaymentMethods && { allowedPaymentMethods: input.allowedPaymentMethods }),
      ...(input.description && { description: input.description }),
      ...(input.merchantPaymentReference && { merchantPaymentReference: input.merchantPaymentReference }),
      ...(input.returnUrl && { returnUrl: input.returnUrl }),
      ...(input.cancelUrl && { cancelUrl: input.cancelUrl }),
      ...(input.metadata && { metadata: input.metadata }),
    }),
  });

  const result = (await response.json()) as DjomyResponse<CreatedPaymentGatewayData>;

  if (!result.success) {
    throw new Error(
      `Djomy create_payment_gateway error: ${result.error?.message ?? result.message}`
    );
  }

  return result.data;
}

/*
Usage example:

const payment = await createPaymentGateway({
  amount: 100000,
  countryCode: "GN",
  payerNumber: "00224623707722",
  allowedPaymentMethods: ["OM", "MOMO"],
  description: "Order #ORD-456",
  merchantPaymentReference: "ORD-456",
  returnUrl: "https://myapp.com/payment/success",
  cancelUrl: "https://myapp.com/payment/cancel",
  metadata: { order_id: "ORD-456" },
});

// payment.transactionId — store this immediately in your database
// Redirect the payer to the Djomy portal:
// window.location.href = payment.redirectUrl;

// Djomy handles the OTP flow internally.
// Set up a webhook endpoint (webhook_payment_completed) to receive the final status.
// Always verify via verify_payment before fulfilling the order.
*/
