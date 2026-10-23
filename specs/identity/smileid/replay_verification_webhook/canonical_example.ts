/**
 * @provider Smile ID
 * @capability replay_verification_webhook
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

interface ReplayAccepted {
  status: string; // "accepted" in the OpenAPI
  job_id: string;
  user_id: string;
  message: string;
}

export async function replayVerificationWebhook(jobId: string, callbackUrl?: string): Promise<ReplayAccepted> {
  const response = await fetch(`${SMILEID_BASE_URL}/v3/replay/${jobId}`, {
    method: "POST",
    headers: await authHeaders(),
    ...(callbackUrl && { body: toForm({ callback_url: callbackUrl }) }),
  });
  if (!response.ok) {
    const error = (await response.json()) as SmileIdError;
    throw new Error(`Smile ID replay_verification_webhook error ${response.status}: ${error.message}`);
  }

  return (await response.json()) as ReplayAccepted;
}

/*
Usage example — re-send a result after all 4 delivery attempts to your callback failed:

await replayVerificationWebhook("job_01m326p53pe1ztjdxh2d9jn9ck");
// 202: queued. The result arrives on the callback URL, not in this response.
// 409 means the job has not reached a terminal state yet — check get_verification_status first.
*/
