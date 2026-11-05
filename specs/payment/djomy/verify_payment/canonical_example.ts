/**
 * @provider Djomy
 * @capability verify_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const DJOMY_CLIENT_ID = process.env.DJOMY_CLIENT_ID;
const DJOMY_CLIENT_SECRET = process.env.DJOMY_CLIENT_SECRET;
if (!DJOMY_CLIENT_ID) throw new Error("Missing env: DJOMY_CLIENT_ID");
if (!DJOMY_CLIENT_SECRET) throw new Error("Missing env: DJOMY_CLIENT_SECRET");

const DJOMY_BASE_URL = "https://sandbox-api.djomy.africa";

interface PaymentStatusData {
  transactionId: string;
  status:
    | "CREATED"
    | "PENDING"
    | "FAILED"
    | "SUCCESS"
    | "REDIRECTED"
    | "CANCELLED";
  paidAmount: number;
  receivedAmount: number;
  fees: number;
  paymentMethod: string;
  payerIdentifier: string;
  currency: string;
  merchantPaymentReference: string;
  createdAt: string;
  providerReference: string;
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
  const result = (await response.json()) as DjomyResponse<{ accessToken: string }>;
  if (!result.success) {
    throw new Error(`Djomy auth error: ${result.message}`);
  }
  return result.data.accessToken;
}

export async function verifyPayment(transactionId: string): Promise<PaymentStatusData> {
  const accessToken = await getAccessToken();
  const signature = await computeHmacHex(DJOMY_CLIENT_ID!, DJOMY_CLIENT_SECRET!);

  const response = await fetch(
    `${DJOMY_BASE_URL}/v1/payments/${encodeURIComponent(transactionId)}/status`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-API-KEY": `${DJOMY_CLIENT_ID}:${signature}`,
      },
    }
  );

  const result = (await response.json()) as DjomyResponse<PaymentStatusData>;

  if (!result.success) {
    throw new Error(
      `Djomy verify_payment error: ${result.error?.message ?? result.message}`
    );
  }

  return result.data;
}

/*
Usage example:

// For the return to returnUrl, or an order no signed webhook confirmed (webhook_payment_completed).
const payment = await verifyPayment(order.transactionId);

if (payment.status === "SUCCESS") {
  // Check it is this order's payment: paidAmount is the full amount (fees are taken from it),
  // currency is Djomy's string (GNF, FCFA, Dollar, Leones), compared before any ISO mapping.
  if (payment.merchantPaymentReference !== order.reference || payment.paidAmount !== order.amount || payment.currency !== order.currency) {
    throw new Error(`Payment ${payment.transactionId} does not match order ${order.reference}`);
  }
  // Fulfil idempotently (the webhook may confirm the same order). receivedAmount is after Djomy fees.
  console.log(`Received: ${payment.receivedAmount} ${payment.currency}`);
} else if (["CREATED", "PENDING", "REDIRECTED"].includes(payment.status)) {
  // Not final yet (not submitted, awaiting the payer, or on the Djomy portal) — poll again or wait for the webhook
} else {
  // FAILED, CANCELLED, or a status this spec does not list — do not fulfill
  console.log(`Payment ${payment.status}: ${payment.transactionId}`);
}
*/
