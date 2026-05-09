/**
 * @provider Notch Pay
 * @capability unblock_customer
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface UnblockCustomerResponse {
  status: string;
  code: number;
  message: string;
}

interface NotchPayError {
  status: string;
  code: number;
  message: string;
}

export async function unblockCustomer(id: string): Promise<UnblockCustomerResponse> {
  const response = await fetch(`https://api.notchpay.co/customers/${id}/unblock`, {
    method: "POST",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<UnblockCustomerResponse>;
}

/*
Usage example:

const result = await unblockCustomer("cus_abc123");

console.log(result.message); // "Customer unblocked"
// After unblocking, the customer can immediately initiate new payments.
// Complete any fraud review or compliance checks before calling unblock_customer.
// Send no request body — an empty POST is expected.
*/
