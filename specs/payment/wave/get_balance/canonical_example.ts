/**
 * @provider Wave
 * @capability get_balance
 * @atss 1.1
 * @capability_type synchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface BalanceResponse {
  amount: string;
  currency: string;
}

interface WaveError {
  code: string;
  message: string;
}

export async function getBalance(
  includeSubaccounts?: boolean
): Promise<BalanceResponse> {
  const url = new URL("https://api.wave.com/v1/balance");
  if (includeSubaccounts) url.searchParams.set("include_subaccounts", "true");

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

  return response.json() as Promise<BalanceResponse>;
}

/*
Usage example :

const balance = await getBalance();
console.log(`Balance: ${balance.amount} ${balance.currency}`);
// "Balance: 125000 XOF"

// amount is a string — parse before comparing
const amount = parseFloat(balance.amount);
if (amount < 10000) {
  console.warn("Insufficient balance for payouts");
}

// For a multi-country wallet, call with different API keys per country
// (each key is tied to a single wallet)
*/
