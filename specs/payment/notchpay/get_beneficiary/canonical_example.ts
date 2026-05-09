/**
 * @provider Notch Pay
 * @capability get_beneficiary
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface NotchPayBeneficiary {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  payment_method: string;
  created_at: string;
}

interface GetBeneficiaryResponse {
  status: string;
  code: number;
  beneficiary: NotchPayBeneficiary;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function getBeneficiary(id: string): Promise<GetBeneficiaryResponse> {
  const response = await fetch(`https://api.notchpay.co/beneficiaries/${id}`, {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<GetBeneficiaryResponse>;
}

/*
Usage example:

const result = await getBeneficiary("ben_abc123");

console.log(result.beneficiary.name);
console.log(result.beneficiary.payment_method);

// Use the Notch Pay beneficiary ID, not the phone/account number.
// A 404 means the beneficiary does not exist for the authenticated account.
// Do not add "Bearer " before the Authorization header value.
*/
