/**
 * @provider Smile ID
 * @capability biometric_kyc
 * @atss 1.1
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
    const error = (await response.json().catch(() => ({}))) as Partial<SmileIdError>;
    throw new Error(`Smile ID token error ${response.status}: ${error.message ?? response.statusText}`);
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

// V3 bodies are multipart/form-data: images are file parts, objects travel as JSON strings.
// Don't set Content-Type yourself — fetch adds it with the multipart boundary.
// The API "expects images as JPEG files, not base64 strings": give each part an image type.
const asJpeg = (b: Blob): Blob => (b.type === "image/jpeg" ? b : new Blob([b], { type: "image/jpeg" }));

/** <smart-camera-web> publishes base64 frames: turn one into a JPEG file part. */
export function jpegFromBase64(base64: string): Blob {
  const bytes = Uint8Array.from(atob(base64.replace(/^data:image\/\w+;base64,/, "")), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: "image/jpeg" });
}

function appendFields(form: FormData, fields: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    form.append(key, typeof value === "string" ? value : JSON.stringify(value));
  }
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

interface BiometricKycInput {
  selfie_image: Blob; // JPEG (a File or Blob): clear, well-lit, front-facing
  liveness_images: Blob[]; // 6–8 JPEG frames
  country: string; // ID Coverage lists Biometric KYC for "KE", "NG", "ZA" (Ghana: on request, undocumented)
  id_type: string; // e.g. "NIN_V2", "BVN" (NG), "NATIONAL_ID" (KE, ZA)
  id_number: string;
  user_details: UserDetails;
  consent: Consent;
  user_id?: string;
  callback_url?: string; // https, on your allowed callback domains
  partner_params?: Record<string, string>;
}

interface VerificationAccepted {
  status: string; // "accepted" — compare case-insensitively
  message: string;
  job_id: string;
  user_id: string;
  created_at: string;
}

export async function submitBiometricKyc(input: BiometricKycInput): Promise<VerificationAccepted> {
  if (input.liveness_images.length < 6 || input.liveness_images.length > 8) {
    throw new Error("liveness_images needs 6 to 8 frames");
  }
  const form = new FormData();
  form.append("selfie_image", asJpeg(input.selfie_image), "selfie.jpg");
  // Every frame under the exact same name — indexed names (liveness_images[0]) deliver only one frame.
  input.liveness_images.forEach((frame, i) => form.append("liveness_images", asJpeg(frame), `liveness-${i}.jpg`));
  appendFields(form, {
    country: input.country,
    id_type: input.id_type,
    id_number: input.id_number,
    user_details: input.user_details,
    consent: input.consent,
    user_id: input.user_id,
    callback_url: input.callback_url,
    partner_params: input.partner_params,
  });

  const response = await fetch(`${SMILEID_BASE_URL}/v3/biometric_kyc`, {
    method: "POST",
    headers: await authHeaders(),
    body: form,
  });
  if (!response.ok) {
    // 413 / 500 may not be JSON: keep the status either way.
    const error = (await response.json().catch(() => ({}))) as Partial<SmileIdError>;
    throw new Error(`Smile ID biometric_kyc error ${response.status}: ${error.message ?? response.statusText}`);
  }
  return (await response.json()) as VerificationAccepted; // 202 — not the verdict
}

/*
Usage example — Nigeria NIN. Capture the selfie and liveness frames with a Smile ID SDK
(<smart-camera-web> in the browser: image_type_id 2 = selfie, 6 = liveness), send them to your backend.
Each published frame is base64: convert it with jpegFromBase64(frame.image) before calling.

const job = await submitBiometricKyc({
  selfie_image: selfieFile,
  liveness_images: livenessFrames, // 6–8 JPEGs
  country: "NG",
  id_type: "NIN_V2",
  id_number: "00000000000",
  user_details: { given_names: "Amina Fatou", last_name: "Clearwater", email: "amina.clearwater@example.com" }, // sandbox: clear
  consent: { granted: true, granted_at: new Date().toISOString(), notice_language: "EN", notice_privacy_policy_url: "https://example.com/privacy" },
  callback_url: "https://example.com/smile-webhook",
  partner_params: { internal_reference: "signup-42" },
});
// Store job.job_id; the verdict (clear | attention | block | error) arrives on the webhook (webhook_verification_result).
*/
