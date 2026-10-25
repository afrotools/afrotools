/**
 * @provider Flutterwave
 * @capability create_payment_method
 * @atss 1.0
 * @capability_type synchronous
 */

const FLUTTERWAVE_CLIENT_CREDENTIALS = process.env.FLUTTERWAVE_CLIENT_CREDENTIALS;
if (!FLUTTERWAVE_CLIENT_CREDENTIALS) throw new Error("Missing env: FLUTTERWAVE_CLIENT_CREDENTIALS");

// Production. Sandbox: https://developersandbox-api.flutterwave.com
const API_BASE_URL = "https://f4bexperience.flutterwave.com";
// Same token URL for sandbox and production.
const TOKEN_URL = "https://idp.flutterwave.com" + "/realms/flutterwave/protocol/openid-connect/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  // afrotools convention: FLUTTERWAVE_CLIENT_CREDENTIALS = base64(client_id:client_secret)
  const decoded = Buffer.from(FLUTTERWAVE_CLIENT_CREDENTIALS!, "base64").toString("utf8");
  const sep = decoded.indexOf(":");
  if (sep === -1) throw new Error("FLUTTERWAVE_CLIENT_CREDENTIALS must be base64(client_id:client_secret)");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: decoded.slice(0, sep),
      client_secret: decoded.slice(sep + 1),
    }).toString(),
  });
  if (!response.ok) throw new Error(`Flutterwave token error ${response.status}: ${await response.text()}`);
  const json = (await response.json()) as { access_token: string; expires_in: number };
  // Tokens last 10 minutes (expires_in: 600); the docs recommend refreshing a minute early.
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return json.access_token;
}

export interface FlutterwaveError {
  status: "failed";
  message?: string | null;
  error?: {
    type: string;
    code: string;
    message: string | null;
    validation_errors?: { field_name: string; message: string }[];
  };
}

/** 12-255 alphanumeric chars, as the docs require for X-Idempotency-Key / X-Trace-Id: a UUID without hyphens. */
export function newKey(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
  traceId?: string;
  scenarioKey?: string; // sandbox only, e.g. "scenario:successful"
}

async function flutterwave<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(API_BASE_URL + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const headers: Record<string, string> = { Authorization: `Bearer ${await getAccessToken()}` };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.idempotencyKey) headers["X-Idempotency-Key"] = opts.idempotencyKey;
  if (opts.traceId) headers["X-Trace-Id"] = opts.traceId;
  if (opts.scenarioKey) headers["X-Scenario-Key"] = opts.scenarioKey;
  const response = await fetch(url, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body, e.g. a Cloudflare 1015 page on HTTP 429.
  }
  if (!response.ok) {
    const e = (parsed ?? {}) as FlutterwaveError;
    throw new Error(
      `Flutterwave ${response.status} ${e.error?.type ?? ""} ${e.error?.code ?? ""}: ` +
        `${e.error?.message ?? e.message ?? text.slice(0, 200)}`,
    );
  }
  return parsed as T;
}

// Dashboard → API settings. Only card fields and PINs need it, so it is checked when used.
const FLUTTERWAVE_ENCRYPTION_KEY = process.env.FLUTTERWAVE_ENCRYPTION_KEY;

/** 12 alphanumeric characters, sent as `nonce` and used as the AES-GCM IV of every encrypted field. */
export function newNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => alphabet[b % alphabet.length]).join("");
}

/** AES-256-GCM, as in the docs' Node sample: key = base64-decoded encryption key, IV = nonce bytes. */
export async function encryptField(value: string, nonce: string): Promise<string> {
  if (!FLUTTERWAVE_ENCRYPTION_KEY) throw new Error("Missing env: FLUTTERWAVE_ENCRYPTION_KEY");
  if (nonce.length !== 12) throw new Error("Nonce must be exactly 12 characters long");
  const key = await crypto.subtle.importKey(
    "raw",
    Uint8Array.from(atob(FLUTTERWAVE_ENCRYPTION_KEY!), (c) => c.charCodeAt(0)),
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new TextEncoder().encode(nonce) },
    key,
    new TextEncoder().encode(value),
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

export interface EncryptedCard {
  nonce: string; // 12 alphanumeric chars, also the AES-GCM IV
  encrypted_card_number: string;
  encrypted_expiry_month: string;
  encrypted_expiry_year: string;
  encrypted_cvv?: string;
  billing_address?: { city: string; country: string; line1: string; line2?: string; postal_code: string; state: string };
}

export type CreatePaymentMethodInput = { customer_id?: string; meta?: Record<string, string> } & (
  | { type: "card"; card: EncryptedCard }
  | { type: "mobile_money"; mobile_money: { country_code: string; network: string; phone_number: string } }
  | { type: "ussd"; ussd: { account_bank: string } } // NGN only; account_bank = bank code from list_banks
  | { type: "opay" } // NGN only
  | { type: "bank_account" } // Pay with Bank (Mono), NGN only
);

export interface PaymentMethod {
  id: string; // pmd_…
  type: string;
  customer_id?: string;
  card?: { first6: string; last4: string; expiry_month: number; expiry_year: number; network: string };
  mobile_money?: { country_code: string; network: string; phone_number: string };
  created_datetime: string;
}

export async function createPaymentMethod(
  input: CreatePaymentMethodInput,
  idempotencyKey: string = newKey(),
): Promise<{ status: "success"; message: string; data: PaymentMethod }> {
  return flutterwave("POST", "/payment-methods", { body: input, idempotencyKey });
}

/** Encrypts raw card fields with one nonce, as the docs' samples do. Never log or store the raw values. */
export async function encryptCard(raw: { number: string; expiryMonth: string; expiryYear: string; cvv: string }): Promise<EncryptedCard> {
  const nonce = newNonce();
  return {
    nonce,
    encrypted_card_number: await encryptField(raw.number, nonce),
    encrypted_expiry_month: await encryptField(raw.expiryMonth, nonce),
    encrypted_expiry_year: await encryptField(raw.expiryYear, nonce),
    encrypted_cvv: await encryptField(raw.cvv, nonce),
  };
}

/*
Usage:
  const card = await encryptCard({ number: "5531886652142950", expiryMonth: "09", expiryYear: "32", cvv: "564" });
  const { data: pm } = await createPaymentMethod({ type: "card", customer_id: "cus_3XarBILKQS", card });

  // Mobile money (Ghana): country_code is the dialling code, phone_number without it
  await createPaymentMethod({
    type: "mobile_money",
    customer_id: "cus_3XarBILKQS",
    mobile_money: { country_code: "233", network: "MTN", phone_number: "9012345678" },
  });
*/
