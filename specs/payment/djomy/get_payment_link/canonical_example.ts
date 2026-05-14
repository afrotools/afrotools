/**
 * @provider Djomy
 * @capability get_payment_link
 * @atss 1.0
 * @capability_type synchronous
 */

const DJOMY_CLIENT_ID = process.env.DJOMY_CLIENT_ID;
const DJOMY_CLIENT_SECRET = process.env.DJOMY_CLIENT_SECRET;
if (!DJOMY_CLIENT_ID) throw new Error("Missing env: DJOMY_CLIENT_ID");
if (!DJOMY_CLIENT_SECRET) throw new Error("Missing env: DJOMY_CLIENT_SECRET");

const DJOMY_BASE_URL = "https://sandbox-api.djomy.africa";

type UsageType = "UNIQUE" | "MULTIPLE";
type LinkStatus = "ACTIVE" | "REVOKED" | "PAID";

interface PaymentLinkData {
  paymentLinkReference: string;
  reference: string;
  linkName: string;
  status: LinkStatus;
  usageType: UsageType;
  amountToPay: number;
  countryCode: string;
  merchantReference: string;
  paymentPageUrl: string;
  createdAt: string;
  expiresAt: string;
  numberOfUsage: number;
  usageLimit: number;
  customFields: Record<string, unknown>[];
  payments: Record<string, unknown>[];
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

export async function getPaymentLink(
  paymentLinkReference: string
): Promise<PaymentLinkData> {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${DJOMY_BASE_URL}/v1/links/${paymentLinkReference}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const result = (await response.json()) as DjomyResponse<PaymentLinkData>;

  if (!result.success) {
    throw new Error(
      `Djomy get_payment_link error: ${result.error?.message ?? result.message}`
    );
  }

  return result.data;
}

/*
Usage example:

// Retrieve a link created earlier to check its status
const link = await getPaymentLink("lnk_abc123xyz");

if (link.status === "ACTIVE") {
  console.log(`Link is active. Payment page: ${link.paymentPageUrl}`);
  console.log(`Used ${link.numberOfUsage} time(s)`);
} else if (link.status === "REVOKED") {
  console.log("Link has been deactivated.");
}

// For UNIQUE links, check numberOfUsage rather than status === "PAID"
// A UNIQUE link becomes REVOKED (not PAID) after one successful payment.
*/
