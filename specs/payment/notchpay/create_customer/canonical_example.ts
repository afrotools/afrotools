/**
 * @provider Notch Pay
 * @capability create_customer
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

interface CreateCustomerInput {
  email?: string;
  phone?: string;
  name?: string;
  company_name?: string;
  metadata?: Record<string, unknown>;
  address?: CustomerAddress;
  billing?: CustomerAddress;
}

interface NotchPayCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  created_at: string;
}

interface CreateCustomerResponse {
  status: string;
  code: number;
  message: string;
  customer: NotchPayCustomer;
}

interface NotchPayError {
  status: string;
  code: number;
  message: string;
}

export async function createCustomer(
  input: CreateCustomerInput
): Promise<CreateCustomerResponse> {
  const response = await fetch("https://api.notchpay.co/customers", {
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

  return response.json() as Promise<CreateCustomerResponse>;
}

/*
Usage example:

const result = await createCustomer({
  name: "Mamadou Diallo",
  email: "mamadou@example.com",
  phone: "+237600000001",
});

console.log(result.customer.id);
// Store result.customer.id to associate payments with this customer later.
// At least one of email or phone must be provided alongside name.
*/
