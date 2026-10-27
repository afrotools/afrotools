/**
 * @provider NimbaSMS
 * @capability verify_code
 * @atss 1.1
 * @capability_type synchronous
 */

const NIMBASMS_SERVICE_ID = process.env.NIMBASMS_SERVICE_ID;
const NIMBASMS_SECRET_TOKEN = process.env.NIMBASMS_SECRET_TOKEN;
if (!NIMBASMS_SERVICE_ID) throw new Error("Missing env: NIMBASMS_SERVICE_ID");
if (!NIMBASMS_SECRET_TOKEN) throw new Error("Missing env: NIMBASMS_SECRET_TOKEN");

const credentials = btoa(`${NIMBASMS_SERVICE_ID}:${NIMBASMS_SECRET_TOKEN}`);

type VerificationStatus =
  | "pending"
  | "sent"
  | "expired"
  | "failure"
  | "received"
  | "too_many_attemps" // typo in the NimbaSMS API (a single 't')
  | "approved"
  | "read";

interface VerifyCodeResponse {
  status: VerificationStatus;
}

interface NimbaSMSError {
  detail?: string;
  code?: string[];
}

export async function verifyCode(
  verificationId: string,
  code: number // integer, not string
): Promise<VerifyCodeResponse> {
  const endpoint = `https://api.nimbasms.com/v1/verifications/${verificationId}`;
  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  if (!response.ok) {
    const error: NimbaSMSError = await response.json();
    throw new Error(`NimbaSMS error ${response.status}: ${error.detail ?? JSON.stringify(error)}`);
  }

  return response.json() as Promise<VerifyCodeResponse>;
}

/*
Usage example:

// code is an integer (not a string)
const userCode = parseInt(req.body.code, 10);
const result = await verifyCode(
  "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", // verificationid from send_verification
  userCode
);

if (result.status === "approved") {
  // Number verified — mark it in the database immediately
  await db.users.markPhoneVerified(userId);
} else if (result.status === "too_many_attemps") {
  // Note: intentional API typo (a single 't') — create a new verification
  throw new Error("Trop de tentatives — veuillez recommencer");
} else if (result.status === "expired") {
  throw new Error("Code expiré — veuillez recommencer");
}

// Call only server-side — never expose verificationid to the client
*/
