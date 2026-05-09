/**
 * @provider Notch Pay
 * @capability delete_customer
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface DeleteCustomerResponse {
  status: string;
  code: number;
  message: string;
}

interface NotchPayError {
  status: string;
  code: number;
  message: string;
}

export async function deleteCustomer(id: string): Promise<DeleteCustomerResponse> {
  const response = await fetch(`https://api.notchpay.co/customers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<DeleteCustomerResponse>;
}

/*
Usage example:

const result = await deleteCustomer("cus_abc123");

console.log(result.message); // "Customer deleted"
// Deletion is permanent — there is no undo via the API.
// Resolve any outstanding payments before deleting the customer record.
*/
