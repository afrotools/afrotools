/**
 * @provider Bictorys
 * @capability get_balance
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface BalanceResponse {
  id?: string;
  type?: "payment" | "transfer" | "refund" | "settlement";
  amount: number;
  pendingAmount?: number;
  currency: string;
  timestamp?: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function getBalance(): Promise<BalanceResponse> {
  const response = await fetch(
    "https://api.bictorys.com/balance-management/v1/balance/me",
    {
      method: "GET",
      headers: {
        "X-API-Key": BICTORYS_SECRET_KEY!,
      },
    }
  );

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<BalanceResponse>;
}

/*
Usage example:

const balance = await getBalance();

console.log("Available balance:", balance.amount, balance.currency);
console.log("Pending balance:", balance.pendingAmount ?? 0, balance.currency);

// Check before initiating a payout:
if (balance.amount >= payoutAmount) {
  await createPayout({ amount: payoutAmount, currency: balance.currency, ... });
}
*/
