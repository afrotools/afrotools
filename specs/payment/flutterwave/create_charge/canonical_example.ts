/**
 * @provider Flutterwave
 * @capability create_charge
 * @atss 1.0
 * @capability_type asynchronous
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

export type NextAction =
  | { type: "redirect_url"; redirect_url: { url: string } }
  | { type: "requires_pin"; requires_pin?: Record<string, unknown> }
  | { type: "requires_otp"; requires_otp?: Record<string, unknown> }
  | { type: "requires_additional_fields"; requires_additional_fields: { fields: string[] } }
  | { type: "payment_instruction"; payment_instruction: { note: string } }
  | { type: "requires_requery"; requires_requery?: Record<string, unknown> }
  | { type: "requires_capture"; requires_capture?: Record<string, unknown> }
  | {
      type: "requires_bank_transfer";
      requires_bank_transfer: {
        account_number: string;
        account_type?: string; // required by the API reference, but never defined there
        account_bank_name: string;
        account_expiration_datetime?: string;
        note?: string;
      };
    }
  | { type: "qr_code"; qr_code: { image: string } };

export interface Charge {
  id: string; // chg_…
  amount: number;
  currency: string;
  customer_id: string;
  reference: string;
  status: "succeeded" | "pending" | "failed" | "voided";
  next_action?: NextAction | null;
  payment_method_details: { id?: string; type?: string; [k: string]: unknown }; // empty {} in some guide samples
  processor_response?: { type: string; code: string; message?: string };
  redirect_url?: string | null;
  fees?: { type: string; amount: number }[];
  disputed?: boolean;
  refunded?: boolean;
  settled?: boolean;
  meta?: Record<string, string> | null;
  created_datetime: string;
}

/** What to do next with a charge. Loop on this after create_charge and after every update_charge. */
export function describeNextAction(charge: Charge): string {
  const a = charge.next_action;
  if (!a) return `no action — status ${charge.status}; verify with get_charge before fulfilling`;
  switch (a.type) {
    case "redirect_url":
      return `redirect the customer to ${a.redirect_url.url}`;
    case "requires_pin":
    case "requires_otp":
    case "requires_additional_fields":
      return "collect the input and call update_charge with an authorization object";
    case "payment_instruction":
      return `show the customer: ${a.payment_instruction.note}`;
    case "requires_bank_transfer":
      return `ask the customer to transfer to ${a.requires_bank_transfer.account_number} (${a.requires_bank_transfer.account_bank_name})`;
    case "requires_requery":
      return "do not re-POST: wait 20 s, call get_charge, then 40 s more if still requires_requery";
    case "qr_code":
      return "display next_action.qr_code.image";
    case "requires_capture":
      return "card pre-authorisation order (not covered by these specs)";
    default:
      return "unknown next_action: treat as pending and call get_charge";
  }
}

export interface CreateChargeInput {
  amount: number; // decimal, major units, >= 0.01
  currency: string; // must fit the payment method (mobile money: its country's currency)
  reference: string; // 6-42 chars, ^[a-zA-Z0-9-]+$, unique
  customer_id: string;
  payment_method_id: string;
  redirect_url?: string; // needed for redirect flows (3DS, OPay, Pay with Bank)
  recurring?: boolean; // charge a stored card without authorization
  meta?: Record<string, string>;
}

export async function createCharge(
  input: CreateChargeInput,
  idempotencyKey: string = newKey(), // reuse it if you have to re-send this exact charge
  scenarioKey?: string, // sandbox only, e.g. "scenario:auth_pin&issuer:approved"
): Promise<{ status: string; message: string; data: Charge }> {
  return flutterwave("POST", "/charges", { body: input, idempotencyKey, scenarioKey });
}

/*
Usage:
  const { data: charge } = await createCharge({
    amount: 5000,
    currency: "NGN",
    reference: "order-1042-" + Date.now(),
    customer_id: "cus_3XarBILKQS",
    payment_method_id: "pmd_WRq7L4TM8p",
    redirect_url: "https://shop.example.com/payments/return",
  });
  console.log(describeNextAction(charge)); // e.g. "redirect the customer to https://…"
  // Fulfil only after get_charge (or a verified charge.completed webhook) says status "succeeded"
  // with the amount, currency and reference you expect.
*/
