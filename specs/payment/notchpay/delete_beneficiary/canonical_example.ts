/**
 * @provider Notch Pay
 * @capability delete_beneficiary
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface DeleteBeneficiaryResponse {
  status: string;
  code: number;
  message: string;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function deleteBeneficiary(id: string): Promise<DeleteBeneficiaryResponse> {
  const response = await fetch(`https://api.notchpay.co/beneficiaries/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<DeleteBeneficiaryResponse>;
}

/*
Usage example:

const result = await deleteBeneficiary("ben_abc123");

console.log(result.message); // "Beneficiary deleted"

// Deletion is permanent — there is no undo.
// A 404 means the beneficiary does not exist or belongs to a different account.
// Do not add "Bearer " before the Authorization header value.
*/
