/**
 * @provider Flutterwave
 * @capability create_transfer_recipient
 * @atss 1.0
 * @capability_type synchronous
 */

const FLUTTERWAVE_CLIENT_ID = process.env.FLUTTERWAVE_CLIENT_ID;
const FLUTTERWAVE_CLIENT_SECRET = process.env.FLUTTERWAVE_CLIENT_SECRET;
if (!FLUTTERWAVE_CLIENT_ID) throw new Error("Missing env: FLUTTERWAVE_CLIENT_ID");
if (!FLUTTERWAVE_CLIENT_SECRET) throw new Error("Missing env: FLUTTERWAVE_CLIENT_SECRET");

// Production. Sandbox: https://developersandbox-api.flutterwave.com
const API_BASE_URL = "https://f4bexperience.flutterwave.com";
// Same token URL for sandbox and production.
const TOKEN_URL = "https://idp.flutterwave.com" + "/realms/flutterwave/protocol/openid-connect/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: FLUTTERWAVE_CLIENT_ID!,
      client_secret: FLUTTERWAVE_CLIENT_SECRET!,
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

type Name = { first: string; middle?: string; last: string };
type Phone = { country_code: string; number: string };
type Address = { city: string; country: string; line1: string; line2?: string; postal_code: string; state: string };

/** The common corridors; the schema has one branch per type (25 in all). */
export type CreateRecipientInput =
  | { type: "bank_ngn"; bank: { account_number: string; code: string } }
  | { type: "bank_kes" | "bank_etb" | "bank_mwk"; name: Name; bank: { account_number: string; code: string } }
  | {
      type: "bank_ghs" | "bank_rwf" | "bank_sll" | "bank_ugx" | "bank_xaf" | "bank_xof";
      name: Name;
      bank: { account_number: string; code: string; branch: string };
    }
  | {
      type: "bank_usd";
      name: Name;
      phone: Phone;
      email: string;
      address: Address;
      bank: { account_number: string; code: string; account_type: "checking" | "savings"; routing_number: string; swift_code: string };
    }
  | {
      type: "mobile_money_ghs" | "mobile_money_kes" | "mobile_money_rwf" | "mobile_money_tzs" | "mobile_money_ugx" | "mobile_money_zmw" | "mobile_money_etb";
      name: Name;
      mobile_money: { network: string; msisdn: string }; // msisdn starts with the country code
    }
  | { type: "mobile_money_xaf" | "mobile_money_xof"; name: Name; mobile_money: { network: string; msisdn: string; country: string } };

export interface Recipient {
  id: string; // rcb_… for bank recipients
  type: "bank" | "mobile_money" | "wallet" | "cash_pickup" | "crypto";
  currency: string;
  name?: Name;
  bank?: { account_number: string; code: string; branch?: string; name?: string };
  mobile_money?: { network: string; msisdn: string; country?: string };
}

export async function createTransferRecipient(
  input: CreateRecipientInput,
  idempotencyKey: string = newKey(),
): Promise<{ status: "success"; message: string; data: Recipient }> {
  return flutterwave("POST", "/transfers/recipients", { body: input, idempotencyKey });
}

/*
Usage:
  // Nigerian bank account (code from list_banks)
  const { data: r1 } = await createTransferRecipient({ type: "bank_ngn", bank: { account_number: "0690000031", code: "044" } });

  // Ghana mobile money (network from list_mobile_networks, msisdn with 233 prefix)
  const { data: r2 } = await createTransferRecipient({
    type: "mobile_money_ghs",
    name: { first: "Kofi", last: "Mensah" },
    mobile_money: { network: "MTN", msisdn: "233241234567" },
  });
  // keep r1.id / r2.id as payment_instruction.recipient_id in create_transfer
*/
