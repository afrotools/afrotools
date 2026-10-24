/**
 * @provider Smile ID
 * @capability document_verification
 * @atss 1.0
 * @capability_type sdk
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

interface PartnerDetails {
  partner_id: string;
  name: string;
  logo_url: string;
  policy_url: string;
  theme_color: string;
}

interface DocumentVerificationConfig {
  token: string;
  product: "doc_verification"; // per the Web SDK reference; the FAQ says "document_verification" — see gotchas
  callback_url: string;
  environment: "sandbox" | "production";
  partner_details: PartnerDetails; // all five fields required
  consent_information?: { granted: true; granted_at: string; notice_language?: string; notice_privacy_policy_url?: string };
  user_details?: { given_names: string; last_name: string; email?: string; phone_number?: string };
  consent_region?: "eu" | "non-eu";
  id_selection?: Record<string, string[]>; // e.g. { SN: ["IDENTITY_CARD", "PASSPORT"] }
  partner_params?: Record<string, string>;
  hide_attribution?: boolean;
  document_capture_modes?: ("camera" | "upload")[];
}

interface DocumentVerificationOptions {
  callback_url: string;
  environment: "sandbox" | "production";
  partner_details: Omit<PartnerDetails, "partner_id">;
  id_selection?: Record<string, string[]>;
  partner_params?: Record<string, string>;
  document_capture_modes?: ("camera" | "upload")[];
}

// Server-side: mint a token per session and return the config to the page.
// The API key never reaches the browser — only the 15-minute token does.
export async function buildDocumentVerificationConfig(
  options: DocumentVerificationOptions
): Promise<DocumentVerificationConfig> {
  const headers = await authHeaders();
  return {
    ...options,
    token: headers["SmileID-Token"],
    product: "doc_verification",
    partner_details: { partner_id: SMILEID_PARTNER_ID!, ...options.partner_details },
  };
}

/*
Usage example:

// 1. Backend route (e.g. GET /sessions/new):
const config = await buildDocumentVerificationConfig({
  callback_url: "https://example.com/smile-webhook",
  environment: "production",
  partner_details: {
    name: "Acme",
    logo_url: "https://example.com/logo.png",
    policy_url: "https://example.com/privacy",
    theme_color: "#001096",
  },
  id_selection: { GN: ["IDENTITY_CARD", "PASSPORT"] },
  partner_params: { internal_reference: "signup-42" },
});

// 2. Page served over HTTPS (or localhost), with allow="camera" on any wrapping iframe:
// <script src="https://cdn.usesmileid.com/inline/v12/js/script.min.js"></script>
// window.SmileIdentity({
//   ...config,
//   onResult: (result) => {
//     // 'success' = job accepted (202), result.value = { job_id, user_id, status, message, created_at }
//     // 'failure' = result.error.error_code (CONSENT_DENIED, NOT_PERMITTED, ...)
//     // 'cancelled' = user closed the flow
//     // The verdict only arrives on the webhook (webhook_verification_result).
//   },
// });
*/
