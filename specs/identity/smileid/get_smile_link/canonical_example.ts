/**
 * @provider Smile ID
 * @capability get_smile_link
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

interface SmileLink {
  ref_id: string;
  link: string;
  name: string;
  description?: string | null;
  id_types?: { country: string; id_type: string; verification_method: string }[];
  is_single_use?: boolean;
  callback_url?: string;
  notice_privacy_policy_url?: string;
  logo_url?: string;
  redirect_url?: string | null;
  theme_color?: string;
  expires_at?: string | null;
  disabled_at?: string | null; // set while the link is disabled
  partner_params?: Record<string, string> | null;
  user_id?: string | null;
  token_provided_fields?: string[];
  token_provided_values?: {
    country?: string;
    id_type?: string;
    consent?: { granted: boolean; granted_at: string; notice_language: string; notice_privacy_policy_url: string };
  };
  created_at?: string;
  updated_at?: string;
}

export async function getSmileLink(refId: string): Promise<SmileLink> {
  const response = await fetch(`${SMILEID_BASE_URL}/v3/smile_links/${refId}`, {
    method: "GET",
    headers: await authHeaders(),
  });
  if (!response.ok) {
    const error = (await response.json()) as SmileIdError;
    throw new Error(`Smile ID get_smile_link error ${response.status}: ${error.message}`);
  }

  return (await response.json()) as SmileLink;
}

/*
Usage example:

const link = await getSmileLink(created.ref_id); // ref_id returned by create_smile_link (uuid)
if (link.disabled_at) {
  // the link is disabled
}
*/
