/**
 * @provider Notch Pay
 * @capability list_payments
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface ListPaymentsInput {
  limit?: number;
  page?: number;
  search?: string;
  status?: string;
  channels?: string;
  date_start?: string;
  date_end?: string;
}

interface NotchPayPaymentItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer: string;
  created_at: string;
  completed_at: string;
}

interface ListPaymentsResponse {
  status: string;
  message: string;
  code: number;
  items: NotchPayPaymentItem[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listPayments(
  input: ListPaymentsInput = {}
): Promise<ListPaymentsResponse> {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.page !== undefined) params.set("page", String(input.page));
  if (input.search) params.set("search", input.search);
  if (input.status) params.set("status", input.status);
  if (input.channels) params.set("channels", input.channels);
  if (input.date_start) params.set("date_start", input.date_start);
  if (input.date_end) params.set("date_end", input.date_end);

  const queryString = params.toString();
  const url = `https://api.notchpay.co/payments${queryString ? `?${queryString}` : ""}`;

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

  return response.json() as Promise<ListPaymentsResponse>;
}

/*
Usage example:

// Fetch the first page of completed payments in January 2024
const result = await listPayments({
  status: "complete",
  date_start: "2024-01-01T00:00:00Z",
  date_end: "2024-01-31T23:59:59Z",
  limit: 20,
  page: 1,
});

console.log(`Page ${result.current_page} of ${result.last_page}`);
for (const payment of result.items) {
  console.log(payment.reference, payment.amount, payment.status);
}

// Iterate all pages by incrementing page until current_page === last_page.
// All query parameters are optional — omit them to get the full paginated list.
*/
