/**
 * @provider Notch Pay
 * @capability get_customer
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface NotchPayCustomerDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  created_at: string;
  updated_at: string;
  blocked: boolean;
}

interface GetCustomerResponse {
  status: string;
  code: number;
  customer: NotchPayCustomerDetail;
}

interface NotchPayError {
  status: string;
  code: number;
  message: string;
}

export async function getCustomer(id: string): Promise<GetCustomerResponse> {
  const response = await fetch(`https://api.notchpay.co/customers/${id}`, {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<GetCustomerResponse>;
}

/*
Usage example:

const result = await getCustomer("cus_abc123");

console.log(result.customer.blocked);
// blocked is only present in get_customer, not in list_customers items.
// Use get_customer when you need to check block status before initiating a payment.
*/
