/**
 * @provider Flutterwave
 * @capability create_orchestrator_transfer
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

export interface Transfer {
  id: string; // trf_…
  type?: "bank" | "mobile_money" | "wallet" | "cash_pickup" | "crypto"; // absent from some guide samples
  action?: "instant" | "deferred" | "scheduled" | "retry" | "duplicate";
  reference?: string;
  status: "NEW" | "PENDING" | "FAILED" | "SUCCESSFUL" | "CANCELLED" | "INITIATED";
  source_currency: string;
  destination_currency: string;
  amount: { value: number; applies_to: "source_currency" | "destination_currency" };
  fee?: { currency: string; value: number };
  debit_information?: Record<string, unknown>;
  provider_response?: { type: string; code: string; message?: string }; // type lowercase, e.g. "insufficient_balance"; code e.g. "0307"
  reversal?: Record<string, unknown> | null;
  recipient?: Record<string, unknown>;
  created_datetime: string;
}

export interface DisburseOption {
  date_time: string; // 'YYYY-MM-DD HH:MM:SS', more than 30 minutes in the future
  timezone: string; // one of the API's timezone enum values, e.g. "Africa/Lagos", "UTC"
}

type Amount = { value: number; applies_to: "source_currency" | "destination_currency" };

/** The common branches; see the schema for EGP / EUR / GBP / USD / ZAR KYC fields. */
export type OrchestratorTransferInput = {
  action: "instant" | "deferred" | "scheduled";
  reference?: string;
  narration?: string;
  callback_url?: string;
  disburse_option?: DisburseOption; // required when action is "scheduled"
  meta?: Record<string, string>;
} & (
  | {
      type: "bank";
      payment_instruction: {
        source_currency: string;
        destination_currency: "NGN";
        amount: Amount;
        recipient: { bank: { account_number: string; code: string } };
      };
    }
  | {
      type: "bank";
      payment_instruction: {
        source_currency: string;
        destination_currency: "GHS" | "RWF" | "SLL" | "UGX" | "XAF" | "XOF";
        amount: Amount;
        recipient: { name: { first: string; last: string }; bank: { account_number: string; code: string; branch: string } };
      };
    }
  | {
      type: "mobile_money";
      payment_instruction: {
        source_currency: string;
        destination_currency: "GHS" | "KES" | "RWF" | "TZS" | "UGX" | "ZMW" | "ETB";
        amount: Amount;
        // msisdn starts with the country code (e.g. 233… for GHS)
        recipient: { name: { first: string; last: string }; mobile_money: { network: string; msisdn: string } };
      };
    }
  | {
      type: "mobile_money";
      payment_instruction: {
        source_currency: string;
        destination_currency: "XAF" | "XOF";
        amount: Amount;
        recipient: { name: { first: string; last: string }; mobile_money: { network: string; msisdn: string; country: string } };
      };
    }
  | {
      type: "wallet";
      payment_instruction: {
        source_currency: string;
        destination_currency: string;
        amount: Amount;
        recipient: { wallet: { provider: "flutterwave"; identifier: string } }; // identifier = the merchant ID (MID)
      };
    }
);

export async function createOrchestratorTransfer(
  input: OrchestratorTransferInput,
  idempotencyKey: string = newKey(),
  scenarioKey?: string, // sandbox: "scenario:successful"
): Promise<{ status: "success"; message: string; data: Transfer }> {
  return flutterwave("POST", "/direct-transfers", { body: input, idempotencyKey, scenarioKey });
}

/*
Usage (instant NGN bank payout):
  const { data: transfer } = await createOrchestratorTransfer({
    action: "instant",
    type: "bank",
    reference: "payout-88-" + Date.now(),
    payment_instruction: {
      source_currency: "NGN",
      destination_currency: "NGN",
      amount: { value: 50000, applies_to: "destination_currency" },
      recipient: { bank: { account_number: "0690000040", code: "044" } },
    },
  });
  // transfer.status is "NEW"; transfer.recipient.id can be reused with create_transfer later.
*/
