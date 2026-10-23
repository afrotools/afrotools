/**
 * @provider Smile ID
 * @capability generate_token
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

type SmileIdProduct =
  | "aml"
  | "basic_kyc"
  | "one_time_aml"
  | "biometric_kyc"
  | "address_verification"
  | "document_verification"
  | "enhanced_document_verification"
  | "enhanced_kyc"
  | "phone_number_verification"
  | "smart_selfie_authentication"
  | "smart_selfie_registration"
  | "smart_selfie_compare";

// Fields bound here are injected server-side into downstream V3 calls (and override their body).
// Assumption: the docs don't say how partner_params / payload are encoded in this multipart body —
// they're sent as JSON strings like on the other V3 endpoints. Verify in sandbox.
interface TokenPayload {
  country?: string;
  id_type?: string;
  id_number?: string;
  given_names?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  callback_url?: string;
  consent?: Consent; // all four fields required when present
}

interface GenerateTokenInput {
  user_id?: string;
  partner_params?: Record<string, string>;
  product?: SmileIdProduct;
  use_enrolled_image?: boolean;
  payload?: TokenPayload;
}

interface GenerateTokenResponse {
  token: string;
}

export async function generateToken(input: GenerateTokenInput = {}): Promise<string> {
  const hasBody = Object.values(input).some((v) => v !== undefined);
  const response = await fetch(`${SMILEID_BASE_URL}/v3/token`, {
    method: "POST",
    headers: {
      "SmileID-Partner-ID": SMILEID_PARTNER_ID!,
      "SmileID-API-Key": SMILEID_API_KEY!,
      Accept: "application/json",
    },
    ...(hasBody && { body: toForm({ ...input }) }),
  });
  if (!response.ok) {
    const error = (await response.json()) as SmileIdError;
    throw new Error(`Smile ID generate_token error ${response.status}: ${error.message}`);
  }

  const result = (await response.json()) as GenerateTokenResponse;
  return result.token;
}

/*
Usage example (backend only — never mint tokens or expose the API key in the browser):

const token = await generateToken({
  product: "enhanced_kyc",
  user_id: "user-42",
  partner_params: { internal_reference: "signup-42" },
});

// Send on the next V3 call:
//   SmileID-Partner-ID: <partner id>
//   SmileID-Token: <token>
// The token expires 15 minutes after issuance — mint one per verification request.
*/
