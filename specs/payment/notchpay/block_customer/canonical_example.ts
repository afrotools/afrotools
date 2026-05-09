/**
 * @provider Notch Pay
 * @capability block_customer
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface BlockCustomerResponse {
  status: string;
  code: number;
  message: string;
}

interface NotchPayError {
  status: string;
  code: number;
  message: string;
}

export async function blockCustomer(id: string): Promise<BlockCustomerResponse> {
  const response = await fetch(`https://api.notchpay.co/customers/${id}/block`, {
    method: "POST",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<BlockCustomerResponse>;
}

/*
Usage example:

const result = await blockCustomer("cus_abc123");

console.log(result.message); // "Customer blocked"
// Blocking is reversible — use unblock_customer to restore access.
// Blocking does not cancel payments already in progress.
// Send no request body — an empty POST is expected.
*/
