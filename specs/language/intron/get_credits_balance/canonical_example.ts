/**
 * @provider Intron
 * @capability get_credits_balance
 * @atss 1.0
 * @capability_type synchronous
 */

const INTRON_API_KEY = process.env.INTRON_API_KEY;
if (!INTRON_API_KEY) throw new Error("Missing env: INTRON_API_KEY");

interface CreditsBalance {
  balance: number;
  currency: "NGN" | "USD"; // NGN for accounts set to Nigeria, USD otherwise
}

interface IntronResponse {
  data: CreditsBalance;
  message: string;
  status: string; // "success" on this endpoint
}

// Error bodies (invalid key, rate limit, …) are not documented — don't assume JSON.
async function readBody<T>(response: Response): Promise<T | undefined> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export async function getCreditsBalance(): Promise<CreditsBalance> {
  const response = await fetch("https://infer.voice.intron.io/accounts/v1/balance", {
    method: "GET",
    headers: { Authorization: `Bearer ${INTRON_API_KEY}` },
  });
  const body = await readBody<IntronResponse>(response);
  if (!response.ok || !body?.data) {
    throw new Error(`Intron get_credits_balance error ${response.status}: ${body?.message ?? "unknown"}`);
  }
  return body.data;
}

/*
Usage example:

const { balance, currency } = await getCreditsBalance();
console.log(`Intron credits: ${balance} ${currency}`);
*/
