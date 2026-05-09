/**
 * @provider Notch Pay
 * @capability update_customer
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface CustomerAddress {
  country?: string;
  state?: string;
  city?: string;
  postal_code?: string;
  address_line1?: string;
  address_line2?: string;
}

interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  metadata?: Record<string, unknown>;
  address?: CustomerAddress;
  billing?: CustomerAddress;
}

interface NotchPayCustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

interface UpdateCustomerResponse {
  status: string;
  code: number;
  message: string;
  customer: NotchPayCustomerDetail;
}

interface NotchPayError {
  status: string;
  code: number;
  message: string;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
): Promise<UpdateCustomerResponse> {
  const response = await fetch(`https://api.notchpay.co/customers/${id}`, {
    method: "POST",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<UpdateCustomerResponse>;
}

/*
Usage example:

const result = await updateCustomer("cus_abc123", {
  phone: "+237600000002",
  address: { city: "Douala", country: "CM" },
});

console.log(result.customer.updated_at);
// Notch Pay uses POST (not PATCH or PUT) for partial updates.
// Include at least one field to update — an empty body returns a 422 error.
*/
