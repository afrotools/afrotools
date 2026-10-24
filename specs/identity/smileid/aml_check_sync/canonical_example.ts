/**
 * @provider Smile ID
 * @capability aml_check_sync
 * @atss 1.0
 * @capability_type synchronous
 */

const SMILEID_PARTNER_ID = process.env.SMILEID_PARTNER_ID;
const SMILEID_API_KEY = process.env.SMILEID_API_KEY;
if (!SMILEID_PARTNER_ID) throw new Error("Missing env: SMILEID_PARTNER_ID");
if (!SMILEID_API_KEY) throw new Error("Missing env: SMILEID_API_KEY");

// Production. Sandbox: https://testapi.smileidentity.com — keys and tokens are per environment.
const SMILEID_BASE_URL = "https://api.smileidentity.com";

interface SmileIdError {
  status: string;
  message: string;
}

// Step 1 of every call: exchange the API key for a JWT. It expires after 15 minutes —
// Smile ID recommends a fresh token per verification request.
async function getToken(): Promise<string> {
  const response = await fetch(`${SMILEID_BASE_URL}/v3/token`, {
    method: "POST",
    headers: {
      "SmileID-Partner-ID": SMILEID_PARTNER_ID!,
      "SmileID-API-Key": SMILEID_API_KEY!,
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const error = (await response.json()) as SmileIdError;
    throw new Error(`Smile ID token error ${response.status}: ${error.message}`);
  }
  return ((await response.json()) as { token: string }).token;
}

// Step 2: both headers on every V3 call.
async function authHeaders(): Promise<Record<string, string>> {
  return {
    "SmileID-Partner-ID": SMILEID_PARTNER_ID!,
    "SmileID-Token": await getToken(),
    Accept: "application/json",
  };
}

// V3 bodies are multipart/form-data; nested objects and arrays travel as JSON strings
// (documented for user_details, consent, partner_params, id_types, countries, aliases).
// Don't set Content-Type yourself — fetch adds it with the multipart boundary.
function toForm(fields: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    form.append(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  return form;
}

interface Consent {
  granted: true;
  granted_at: string; // ISO 8601
  notice_language: string; // uppercase ISO 639-1, e.g. "FR"
  notice_privacy_policy_url: string; // https
}

interface UserDetails {
  given_names: string;
  last_name: string;
  email?: string | null; // at least one of email / phone_number
  phone_number?: string | null; // E.164, e.g. "+2250700000000"
}

interface AmlCheckInput {
  countries: string[]; // ISO 3166-1 alpha-2
  full_name: string; // the name actually screened
  consent: Consent;
  user_details: UserDetails;
  user_id?: string;
  birth_year?: string; // four digits
  strict_match?: boolean; // default true
  aliases?: string[]; // max 20
  search_existing_user?: boolean;
  callback_url?: string; // stored for replay only — no webhook is sent
  partner_params?: Record<string, string>;
  metadata?: { name: string; value: string }[];
}

interface AmlPerson {
  name?: string;
  addresses?: unknown[]; // strings per the webhook page, objects per the OpenAPI
  news_summary?: { news_category?: string; news_category_label?: string; number_of_articles?: number }[];
  aliases?: unknown[];
  associations?: unknown[];
  dates_of_birth?: unknown[];
  enforcement_actions?: unknown[];
  nationalities?: unknown[];
  sanctions?: unknown[];
  pep?: { pep_level?: number | string | null; political_positions?: unknown[]; sources?: unknown[] };
  ref?: string;
}

interface AmlResult {
  status: "clear" | "block" | "attention" | "error";
  message: string;
  reason: "aml_match_found" | "news_media_match" | "service_unavailable" | "high_risk" | null;
  created_at: string;
  completed_at?: string;
  product: "one_time_aml";
  partner_params: Record<string, string> | null;
  kyc_receipt: string | null;
  strict_match: boolean;
  no_of_persons_found: number;
  people: AmlPerson[];
  user_provided_info: { given_names: string | null; last_name: string | null; email: string | null; phone_number: string | null };
  consent: Record<string, unknown>; // ISO 27560 consent record
  antifraud: Record<string, unknown> | null;
  device_signals: Record<string, unknown> | null;
}

// idempotencyKey: 16-128 chars of A-Z a-z 0-9 - _ ; reuse it on retry to avoid a second billed screening.
export async function amlCheckSync(input: AmlCheckInput, idempotencyKey?: string): Promise<AmlResult> {
  const headers = await authHeaders();
  if (idempotencyKey) headers["SmileID-Idempotency-Key"] = idempotencyKey;
  const response = await fetch(`${SMILEID_BASE_URL}/v3/aml/sync`, {
    method: "POST",
    headers,
    body: toForm({ ...input }),
  });
  if (!response.ok) {
    const error = (await response.json()) as SmileIdError;
    throw new Error(`Smile ID aml_check_sync error ${response.status}: ${error.message}`);
  }

  return (await response.json()) as AmlResult;
}

/*
Usage example:

const result = await amlCheckSync(
  {
    countries: ["CI", "SN"],
    full_name: "Nkechi Okafor Cleanford",
    user_details: { given_names: "Nkechi Okafor", last_name: "Cleanford", email: "nkechi@example.com" },
    consent: {
      granted: true,
      granted_at: new Date().toISOString(),
      notice_language: "FR",
      notice_privacy_policy_url: "https://example.com/privacy",
    },
  },
  "signup-42-aml-0001"
);

// result.status: clear | attention (news media only) | block (aml_match_found | high_risk) | error
// On 408 the screening timed out (nothing billed, job terminal in error): resubmit with a NEW key.
// Reuse the same key only when you got no response at all — it returns the original result.
*/
