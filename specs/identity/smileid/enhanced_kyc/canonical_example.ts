/**
 * @provider Smile ID
 * @capability enhanced_kyc
 * @atss 1.0
 * @capability_type asynchronous
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

interface EnhancedKycInput {
  country: string; // ISO 3166-1 alpha-2, e.g. "CI"
  id_type: string; // e.g. "NATIONAL_ID_NO_PHOTO"
  id_number: string;
  user_details: UserDetails;
  consent: Consent;
  user_id?: string;
  callback_url?: string; // https, on your allowed callback domains
  bank_code?: string;
  operator?: string;
  citizenship?: "Kenyan" | "Alien";
  partner_params?: Record<string, string>;
  metadata?: { name: string; value: string }[];
}

interface EnhancedKycAccepted {
  status: string; // "accepted" in the OpenAPI, "Accepted" elsewhere — compare case-insensitively
  message: string;
  job_id: string;
  user_id: string;
  created_at: string;
}

export async function submitEnhancedKyc(input: EnhancedKycInput): Promise<EnhancedKycAccepted> {
  const response = await fetch(`${SMILEID_BASE_URL}/v3/enhanced_kyc`, {
    method: "POST",
    headers: await authHeaders(),
    body: toForm({ ...input }),
  });
  if (!response.ok) {
    const error = (await response.json()) as SmileIdError;
    throw new Error(`Smile ID enhanced_kyc error ${response.status}: ${error.message}`);
  }

  return (await response.json()) as EnhancedKycAccepted;
}

/*
Usage example — Côte d'Ivoire national ID (NNI: 11 digits, or the alphanumeric document number):

const job = await submitEnhancedKyc({
  country: "CI",
  id_type: "NATIONAL_ID_NO_PHOTO",
  id_number: "00000000000",
  user_details: { given_names: "Amina Fatou", last_name: "Clearwater", email: "amina.clearwater@example.com" },
  consent: {
    granted: true,
    granted_at: new Date().toISOString(),
    notice_language: "FR",
    notice_privacy_policy_url: "https://example.com/privacy",
  },
  callback_url: "https://example.com/smile-webhook",
  partner_params: { internal_reference: "signup-42" },
});

// HTTP 202, job.status "accepted" — this is NOT the verdict.
// Store job.job_id, then wait for the webhook (webhook_verification_result), which carries
// status (clear | attention | block | error) and id_fields. get_verification_status only returns the status.
*/
