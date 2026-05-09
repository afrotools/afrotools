/**
 * @provider Notch Pay
 * @capability list_customer_payments
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface ListCustomerPaymentsInput {
  limit?: number;
  page?: number;
}

interface NotchPayPayment {
  [key: string]: unknown;
}

interface ListCustomerPaymentsResponse {
  status: string;
  code: number;
  items: NotchPayPayment[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

interface NotchPayError {
  status: string;
  code: number;
  message: string;
}

export async function listCustomerPayments(
  customerId: string,
  input: ListCustomerPaymentsInput = {}
): Promise<ListCustomerPaymentsResponse> {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.page !== undefined) params.set("page", String(input.page));

  const qs = params.size > 0 ? `?${params.toString()}` : "";
  const url = `https://api.notchpay.co/customers/${customerId}/payments${qs}`;

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

  return response.json() as Promise<ListCustomerPaymentsResponse>;
}

/*
Usage example:

const result = await listCustomerPayments("cus_abc123", { limit: 10, page: 1 });

if (result.items.length === 0) {
  console.log("No payments found for this customer.");
} else {
  for (const payment of result.items) {
    console.log(payment);
  }
}

// The customer ID is in the URL path; pagination params are in the query string.
// A 404 means the customer does not exist — verify the customer first.
*/
