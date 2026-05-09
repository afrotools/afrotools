/**
 * @provider Notch Pay
 * @capability list_customer_payment_methods
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface PaymentMethod {
  id: string;
  channel: string;
  data: Record<string, unknown>;
  created_at: string;
}

interface ListCustomerPaymentMethodsResponse {
  status: string;
  code: number;
  items: PaymentMethod[];
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listCustomerPaymentMethods(
  customerId: string
): Promise<ListCustomerPaymentMethodsResponse> {
  const url = `https://api.notchpay.co/customers/${customerId}/payment_methods`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ListCustomerPaymentMethodsResponse>;
}

/*
Usage example:

const result = await listCustomerPaymentMethods("cus_abc123");

if (result.items.length === 0) {
  console.log("No saved payment methods for this customer.");
} else {
  for (const method of result.items) {
    // method.channel: "cm.mtn", method.data: { phone: "+237670000000" }
    console.log(`${method.channel}:`, method.data);
  }
}

// A 404 means the customer does not exist.
// An empty items array is normal — the customer has no saved methods yet.
*/
