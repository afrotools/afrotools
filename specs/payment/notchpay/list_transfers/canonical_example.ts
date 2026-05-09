/**
 * @provider Notch Pay
 * @capability list_transfers
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");
const NOTCHPAY_GRANT_TOKEN = process.env.NOTCHPAY_GRANT_TOKEN;
if (!NOTCHPAY_GRANT_TOKEN) throw new Error("Missing env: NOTCHPAY_GRANT_TOKEN");

interface ListTransfersInput {
  limit?: number;
  page?: number;
  search?: string;
  status?: "pending" | "complete" | "failed";
  channels?: string;
  date_start?: string;
  date_end?: string;
}

interface NotchPayTransfer {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: "pending" | "complete" | "failed";
  beneficiary: string;
  created_at: string;
  completed_at: string | null;
  payment_method: string;
}

interface ListTransfersResponse {
  status: string;
  message: string;
  code: number;
  items: NotchPayTransfer[];
  totals: number;
  selected: number;
  current_page: number;
  last_page: number;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listTransfers(
  input: ListTransfersInput = {}
): Promise<ListTransfersResponse> {
  const params = new URLSearchParams();
  if (input.limit !== undefined) params.set("limit", String(input.limit));
  if (input.page !== undefined) params.set("page", String(input.page));
  if (input.search !== undefined) params.set("search", input.search);
  if (input.status !== undefined) params.set("status", input.status);
  if (input.channels !== undefined) params.set("channels", input.channels);
  if (input.date_start !== undefined) params.set("date_start", input.date_start);
  if (input.date_end !== undefined) params.set("date_end", input.date_end);

  const query = params.toString();
  const url = `https://api.notchpay.co/transfers${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
      "X-Grant": NOTCHPAY_GRANT_TOKEN!,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ListTransfersResponse>;
}

/*
Usage example:

// Fetch first page of all transfers
const result = await listTransfers({ limit: 20, page: 1 });

console.log(`${result.totals} total transfers, page ${result.current_page} of ${result.last_page}`);
for (const transfer of result.items) {
  console.log(`${transfer.reference}: ${transfer.amount} ${transfer.currency} — ${transfer.status}`);
}

// Filter completed transfers within a date range
const completed = await listTransfers({
  status: "complete",
  date_start: "2024-01-01T00:00:00Z",
  date_end: "2024-01-31T23:59:59Z",
});

// Never treat a "pending" transfer as a successful payout.
// Only "complete" status confirms the funds have been delivered to the beneficiary.
*/
