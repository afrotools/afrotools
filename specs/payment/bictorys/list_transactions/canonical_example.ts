/**
 * @provider Bictorys
 * @capability list_transactions
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface ListTransactionsFilters {
  start_date?: string;
  end_date?: string;
  type?: "checkout" | "payout" | "refund";
  customer_id?: string;
  customer_phone?: string;
  device_id?: string;
  payment_reference?: string;
  page_offset?: number;
  page_size?: number;
}

interface Transaction {
  id: string;
  status: "succeeded" | "failed" | "cancelled" | "pending" | "processing" | "reversed" | "authorized";
  amount: number;
  currency: string;
  type?: string;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

interface ListTransactionsResponse {
  data: Transaction[];
  total?: number;
  page?: number;
  pageSize?: number;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function listTransactions(
  filters: ListTransactionsFilters = {}
): Promise<ListTransactionsResponse> {
  const params = new URLSearchParams();
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.type) params.set("type", filters.type);
  if (filters.customer_id) params.set("customer_id", filters.customer_id);
  if (filters.customer_phone) params.set("customer_phone", filters.customer_phone);
  if (filters.device_id) params.set("device_id", filters.device_id);
  if (filters.payment_reference) params.set("payment_reference", filters.payment_reference);
  if (filters.page_offset !== undefined) params.set("page_offset", String(filters.page_offset));
  if (filters.page_size !== undefined) params.set("page_size", String(filters.page_size));

  const query = params.toString();
  const url = "https://api.bictorys.com/pay/v1/transactions" + (query ? "?" + query : "");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": BICTORYS_SECRET_KEY!,
    },
  });

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<ListTransactionsResponse>;
}

/*
Usage example — list today's successful checkout transactions (page 1):

const result = await listTransactions({
  start_date: "2026-06-06",
  end_date: "2026-06-06",
  type: "checkout",
  page_offset: 0,
  page_size: 50,
});

console.log("Transactions found:", result.total);
for (const tx of result.data) {
  console.log(tx.id, tx.status, tx.amount, tx.currency);
}

---

Filter by customer phone (useful for reconciliation):

const result = await listTransactions({
  customer_phone: "+221770001234",
  page_size: 20,
});
*/
