/**
 * @provider Notch Pay
 * @capability list_customers
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface ListCustomersInput {
  limit?: number;
  page?: number;
  search?: string;
}

interface NotchPayCustomerSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name: string;
  created_at: string;
}

interface ListCustomersResponse {
  status: string;
  code: number;
  items: NotchPayCustomerSummary[];
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

export async function listCustomers(
  input: ListCustomersInput = {}
): Promise<ListCustomersResponse> {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.page !== undefined) params.set("page", String(input.page));
  if (input.search !== undefined) params.set("search", input.search);

  const url = `https://api.notchpay.co/customers${params.size > 0 ? `?${params.toString()}` : ""}`;

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

  return response.json() as Promise<ListCustomersResponse>;
}

/*
Usage example:

const result = await listCustomers({ limit: 20, page: 1, search: "Mamadou" });

for (const customer of result.items) {
  console.log(customer.id, customer.name);
}

// Paginate until current_page === last_page
// Query parameters are in the URL — never in the request body.
*/
