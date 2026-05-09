/**
 * @provider Notch Pay
 * @capability list_beneficiaries
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface ListBeneficiariesInput {
  limit?: number;
  page?: number;
  search?: string;
}

interface NotchPayBeneficiary {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  payment_method: string;
  created_at: string;
}

interface ListBeneficiariesResponse {
  status: string;
  code: number;
  items: NotchPayBeneficiary[];
  totals: number;
  selected: number;
  current_page: number;
  last_page: number;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listBeneficiaries(
  input: ListBeneficiariesInput = {}
): Promise<ListBeneficiariesResponse> {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.page !== undefined) params.set("page", String(input.page));
  if (input.search !== undefined) params.set("search", input.search);

  const query = params.toString();
  const url = `https://api.notchpay.co/beneficiaries${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ListBeneficiariesResponse>;
}

/*
Usage example:

// Fetch first page with 10 items
const result = await listBeneficiaries({ limit: 10, page: 1 });

// Iterate pages until the last one
for (let page = 1; page <= result.last_page; page++) {
  const pageResult = await listBeneficiaries({ limit: 10, page });
  // process pageResult.items
}

// Query params must be in the URL — not in a request body.
// Do not add "Bearer " before the Authorization header value.
*/
