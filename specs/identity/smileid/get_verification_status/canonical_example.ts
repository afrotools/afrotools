/**
 * @provider Smile ID
 * @capability get_verification_status
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

interface VerificationStatus {
  status: "clear" | "block" | "attention" | "error" | "processing" | "not_found";
  job_id: string;
  user_id: string;
  message: string;
  created_at: string;
}

// 200 = terminal (clear | block | attention | error), 202 = processing, 404 = not_found.
export async function getVerificationStatus(jobId: string): Promise<VerificationStatus> {
  const response = await fetch(`${SMILEID_BASE_URL}/v3/status/${jobId}`, {
    method: "GET",
    headers: await authHeaders(),
  });
  if (response.status === 200 || response.status === 202 || response.status === 404) {
    return (await response.json()) as VerificationStatus;
  }
  const error = (await response.json()) as SmileIdError;
  throw new Error(`Smile ID get_verification_status error ${response.status}: ${error.message}`);
}

/*
Usage example — poll an Enhanced KYC job:

let result = await getVerificationStatus("job_01m326p53pe1ztjdxh2d9jn9ck");
while (result.status === "processing") {
  await new Promise((r) => setTimeout(r, 5000));
  result = await getVerificationStatus(result.job_id);
}
// Only the status: id_fields and the full result come from the webhook
// (or replay_verification_webhook).
*/
