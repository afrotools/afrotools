/**
 * @provider Wave
 * @capability verify_recipient
 * @atss 1.1
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface VerifyRecipientInput {
  mobile: string;
  name?: string;
  national_id?: string;
  amount?: string;
  currency?: string;
}

interface VerifyRecipientResponse {
  within_limits: boolean | null;
  name_match: "MATCH" | "NO_MATCH" | "NAME_NOT_KNOWN" | null;
  national_id_match: "MATCH" | "NO_MATCH" | "ID_NOT_KNOWN" | null;
}

interface WaveError {
  code: string;
  message: string;
}

export async function verifyRecipient(
  input: VerifyRecipientInput
): Promise<VerifyRecipientResponse> {
  const response = await fetch("https://api.wave.com/v1/verify_recipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<VerifyRecipientResponse>;
}

/*
Usage example :

const result = await verifyRecipient({
  mobile: "+221700000000",
  name: "Mamadou Diallo",
  amount: "50000",
  currency: "XOF",
});

// Check the ability to receive the amount
if (result.within_limits === false) {
  throw new Error("The recipient cannot receive this amount (limit exceeded)");
}

// Check the name
if (result.name_match === "NO_MATCH") {
  // Warn the user — do not block automatically
  console.warn("The name provided does not match the Wave account");
}

// NAME_NOT_KNOWN = the recipient is not KYC-2 at Wave
// This is not an error — do not block the payout on this basis
if (result.name_match === "NAME_NOT_KNOWN") {
  console.log("Name check not possible: insufficient KYC data");
}

// WARNING: max 30 checks of the same number per 5 minutes
// Beyond that, this number is blocked for 60 minutes
*/
