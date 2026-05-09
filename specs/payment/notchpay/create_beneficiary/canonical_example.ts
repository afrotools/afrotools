/**
 * @provider Notch Pay
 * @capability create_beneficiary
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface CreateBeneficiaryInput {
  channel: string;
  name: string;
  account_number: string;
  email?: string;
  phone?: string;
}

interface NotchPayBeneficiary {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  payment_method: string;
  created_at: string;
}

interface CreateBeneficiaryResponse {
  status: string;
  code: number;
  message: string;
  beneficiary: NotchPayBeneficiary;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function createBeneficiary(
  input: CreateBeneficiaryInput
): Promise<CreateBeneficiaryResponse> {
  const response = await fetch("https://api.notchpay.co/beneficiaries", {
    method: "POST",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<CreateBeneficiaryResponse>;
}

/*
Usage example:

const result = await createBeneficiary({
  channel: "cm.mtn",
  name: "Jean Dupont",
  account_number: "+237671234567",
});

// Store result.beneficiary.id — required for transfers and deletions.
// The channel slug must exactly match a supported Notch Pay channel.
// Do not add "Bearer " before the Authorization header value.
*/
