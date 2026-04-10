/**
 * @provider Djomy
 * @capability create_payment_link
 * @atss 1.0
 * @capability_type synchronous
 */

const DJOMY_CLIENT_ID = process.env.DJOMY_CLIENT_ID;
const DJOMY_CLIENT_SECRET = process.env.DJOMY_CLIENT_SECRET;
if (!DJOMY_CLIENT_ID) throw new Error("Missing env: DJOMY_CLIENT_ID");
if (!DJOMY_CLIENT_SECRET) throw new Error("Missing env: DJOMY_CLIENT_SECRET");

const DJOMY_BASE_URL = "https://sandbox-api.djomy.africa";

type UsageType = "UNIQUE" | "MULTIPLE";
type LinkPaymentMethod = "OM" | "MOMO" | "SOUTRA_MONEY" | "PAYCARD" | "CARD";

interface CreatePaymentLinkInput {
  countryCode: string;
  amountToPay?: number;
  linkName?: string;
  description?: string;
  phoneNumber?: string;
  sendSms?: boolean;
  usageType?: UsageType;
  usageLimit?: number;
  expiresAt?: string;
  merchantReference?: string;
  returnUrl?: string;
  cancelUrl?: string;
  allowedPaymentMethods?: LinkPaymentMethod[];
  metadata?: Record<string, string | number | boolean>;
}

interface PaymentLinkData {
  paymentLinkReference: string;
  reference: string;
  linkName: string;
  status: "ACTIVE" | "REVOKED" | "PAID";
  usageType: UsageType;
  amountToPay: number;
  countryCode: string;
  merchantReference: string;
  paymentPageUrl: string;
  createdAt: string;
  expiresAt: string;
  numberOfUsage: number;
  usageLimit: number;
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

export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<PaymentLinkData> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${DJOMY_BASE_URL}/v1/links`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      countryCode: input.countryCode,
      ...(input.amountToPay !== undefined && { amountToPay: input.amountToPay }),
      ...(input.linkName && { linkName: input.linkName }),
      ...(input.description && { description: input.description }),
      ...(input.phoneNumber && { phoneNumber: input.phoneNumber }),
      ...(input.sendSms !== undefined && { sendSms: input.sendSms }),
      ...(input.usageType && { usageType: input.usageType }),
      ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
      ...(input.expiresAt && { expiresAt: input.expiresAt }),
      ...(input.merchantReference && { merchantReference: input.merchantReference }),
      ...(input.returnUrl && { returnUrl: input.returnUrl }),
      ...(input.cancelUrl && { cancelUrl: input.cancelUrl }),
      ...(input.allowedPaymentMethods && { allowedPaymentMethods: input.allowedPaymentMethods }),
      ...(input.metadata && { metadata: input.metadata }),
    }),
  });

  const result = (await response.json()) as DjomyResponse<PaymentLinkData>;

  if (!result.success) {
    throw new Error(
      `Djomy create_payment_link error: ${result.error?.message ?? result.message}`
    );
  }

  return result.data;
}

/*
Usage example:

// Single-use link with fixed amount
const link = await createPaymentLink({
  countryCode: "GN",
  amountToPay: 100000,
  linkName: "Order ORD-456",
  description: "Payment for order ORD-456",
  usageType: "UNIQUE",
  merchantReference: "ORD-456",
  returnUrl: "https://myapp.com/payment/success",
  metadata: { order_id: "ORD-456" },
});

// link.paymentPageUrl — share this URL with the payer (email, SMS, etc.)
// link.paymentLinkReference — store this to retrieve the link later
console.log(`Payment link: ${link.paymentPageUrl}`);

// Send link via SMS
const smsLink = await createPaymentLink({
  countryCode: "GN",
  amountToPay: 50000,
  usageType: "UNIQUE",
  phoneNumber: "00224623707722",
  sendSms: true, // Djomy will SMS the link to the payer
});

// Reusable link (e.g. for donations or recurring collections)
const reusableLink = await createPaymentLink({
  countryCode: "GN",
  usageType: "MULTIPLE",
  linkName: "Monthly donations",
  expiresAt: "2026-12-31T23:59:59Z",
});
*/
