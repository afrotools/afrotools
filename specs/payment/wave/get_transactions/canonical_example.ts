/**
 * @provider Wave
 * @capability get_transactions
 * @atss 1.0
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface GetTransactionsInput {
  date?: string;
  after?: string;
  include_subaccounts?: boolean;
}

interface Transaction {
  timestamp: string;
  transaction_id: string;
  transaction_type:
    | "merchant_payment"
    | "merchant_payment_refund"
    | "api_checkout"
    | "api_checkout_refund"
    | "api_payout"
    | "api_payout_reversal"
    | "bulk_payment"
    | "bulk_payment_reversal"
    | "b2b_payment"
    | "b2b_payment_reversal"
    | "merchant_sweep";
  amount: string;
  fee: string;
  currency: string;
  is_reversal: boolean;
  counterparty_name?: string;
  counterparty_mobile?: string;
  client_reference?: string;
  checkout_api_session_id?: string;
  balance?: string;
  counterparty_id?: string;
  payment_reason?: string;
  batch_id?: string;
  aggregated_merchant_id?: string;
  custom_fields?: Record<string, unknown>;
  submerchant_id?: string;
  government_tax_amount?: string;
}

interface TransactionsResponse {
  page_info: {
    has_next_page: boolean;
    end_cursor: string;
    start_cursor: string | null;
  };
  date: string;
  items: Transaction[];
}

interface WaveError {
  code: string;
  message: string;
}

export async function getTransactions(
  input: GetTransactionsInput = {}
): Promise<TransactionsResponse> {
  const url = new URL("https://api.wave.com/v1/transactions");
  if (input.date) url.searchParams.set("date", input.date);
  if (input.after) url.searchParams.set("after", input.after);
  if (input.include_subaccounts) url.searchParams.set("include_subaccounts", "true");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${WAVE_API_KEY}`,
    },
  });

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<TransactionsResponse>;
}

/** Récupère toutes les transactions d'un jour donné en gérant la pagination. */
export async function getAllTransactionsForDate(date: string): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let cursor: string | undefined;

  do {
    const page = await getTransactions({ date, after: cursor });
    all.push(...page.items);
    cursor = page.page_info.has_next_page ? page.page_info.end_cursor : undefined;
  } while (cursor);

  return all;
}

/*
Usage example :

// Transactions du jour courant (UTC)
const today = await getTransactions();
console.log(`${today.items.length} transactions le ${today.date}`);

// Toutes les transactions d'une date spécifique (avec pagination automatique)
const transactions = await getAllTransactionsForDate("2024-03-15");

// Filtrer uniquement les paiements checkout
const checkouts = transactions.filter(t => t.transaction_type === "api_checkout");

// Les transactions sont retournées de la plus ancienne à la plus récente.
// Pour les plus récentes en premier :
const recent = [...transactions].reverse();
*/
