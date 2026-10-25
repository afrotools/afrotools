/**
 * @provider Smile ID
 * @capability webhook_verification_result
 * @atss 1.1
 * @capability_type webhook
 */

import { createHmac, timingSafeEqual } from "crypto";

const SMILEID_PARTNER_ID = process.env.SMILEID_PARTNER_ID;
const SMILEID_API_KEY = process.env.SMILEID_API_KEY;
if (!SMILEID_PARTNER_ID) throw new Error("Missing env: SMILEID_PARTNER_ID");
if (!SMILEID_API_KEY) throw new Error("Missing env: SMILEID_API_KEY");

type Nullable<T> = T | null;

interface VerificationResultPayload {
  status?: "clear" | "attention" | "block" | "error";
  message?: string;
  reason?: Nullable<string>;
  product?: string; // e.g. "enhanced_kyc", "biometric_kyc", "document_verification"
  created_at?: string;
  completed_at?: string;
  partner_params?: Nullable<Record<string, unknown>>; // job_type: 5 = Enhanced KYC, 6 = Document Verification, 1 = Biometric KYC
  kyc_receipt?: Nullable<string>; // signed URL, expires after 15 minutes
  image_links?: Nullable<{ selfie_image?: Nullable<string>; id_card_image?: Nullable<string>; id_card_back_image?: Nullable<string> }>;
  // null when status is block or error; fields depend on product, country and ID type
  id_fields?: Nullable<Record<string, unknown>>;
  user_provided_info?: Record<string, unknown>;
  antifraud?: Nullable<Record<string, unknown>>;
  device_signals?: Nullable<Record<string, unknown>>;
  consent: Record<string, unknown>; // ISO 27560 record, present in every webhook
}

function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

// HMAC-SHA256(Response-Timestamp + partner ID + "sid_request"), keyed with the API key, base64.
// Use the raw header value — don't reformat the timestamp.
export function verifySmileIdSignature(headers: Record<string, string | string[] | undefined>): boolean {
  const signature = getHeader(headers, "Response-Signature");
  const timestamp = getHeader(headers, "Response-Timestamp");
  if (!signature || !timestamp) return false;
  const expected = createHmac("sha256", SMILEID_API_KEY!)
    .update(timestamp + SMILEID_PARTNER_ID! + "sid_request")
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Framework-agnostic handler: returns the HTTP status to send back.
 * Answer 2xx within 35 seconds — otherwise Smile ID retries (4 attempts in total).
 */
export async function handleSmileIdWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: VerificationResultPayload,
  onResult: (jobId: string | undefined, payload: VerificationResultPayload) => Promise<void>
): Promise<number> {
  if (!verifySmileIdSignature(headers)) return 401;
  // At-least-once, unordered delivery: make onResult idempotent on the job id.
  await onResult(getHeader(headers, "smileid-job-id"), body);
  return 200;
}

/*
Usage example (Express):

app.post("/smile-webhook", express.json(), async (req, res) => {
  const status = await handleSmileIdWebhook(req.headers, req.body, async (jobId, payload) => {
    // Upsert on jobId — the same webhook can arrive more than once.
    if (payload.status === "clear") {
      // approve the user; copy id_fields now (photo/document URLs expire after 15 minutes)
    } else if (payload.status === "attention") {
      // manual review — check payload.reason
    } else {
      // block or error — id_fields is null
    }
  });
  res.sendStatus(status);
});
*/
