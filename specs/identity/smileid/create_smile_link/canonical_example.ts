/**
 * @provider Smile ID
 * @capability create_smile_link
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

interface SmileLinkIdType {
  country: string;
  id_type: string;
  verification_method: string; // the docs don't list the accepted values — see gotchas
}

interface CreateSmileLinkInput {
  id_types: SmileLinkIdType[];
  name: string;
  notice_privacy_policy_url: string;
  is_single_use: boolean;
  callback_url?: string;
  description?: string;
  expires_at?: string; // date-time; single-use links default to 90 days
  logo_url?: string;
  redirect_url?: string;
  theme_color?: string;
  partner_params?: Record<string, string>;
  user_id?: string;
}

interface SmileLinkCreated {
  link: string;
  message: string;
  ref_id: string;
  user_id: string | null;
}

export async function createSmileLink(input: CreateSmileLinkInput): Promise<SmileLinkCreated> {
  const response = await fetch(`${SMILEID_BASE_URL}/v3/smile_links`, {
    method: "POST",
    headers: await authHeaders(),
    body: toForm({ ...input }),
  });
  if (!response.ok) {
    const error = (await response.json()) as SmileIdError;
    throw new Error(`Smile ID create_smile_link error ${response.status}: ${error.message}`);
  }

  return (await response.json()) as SmileLinkCreated;
}

/*
Usage example:

const created = await createSmileLink({
  name: "Onboarding",
  is_single_use: true,
  notice_privacy_policy_url: "https://example.com/privacy",
  callback_url: "https://example.com/smile-webhook",
  id_types: [{ country: "SN", id_type: "IDENTITY_CARD", verification_method: "<verification product>" }],
});

// Send created.link to the user; store created.ref_id (get_smile_link) and created.user_id.
// The redirect after the flow can be forged — decide from the webhook on callback_url.
*/
