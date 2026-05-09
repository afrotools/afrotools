/**
 * @provider Notch Pay
 * @capability get_balance
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");

interface NotchPayBalance {
  total: number;
  available: number;
  pending: number;
  reserved: number;
  currency: string;
  environment: string;
}

interface GetBalanceResponse {
  status: string;
  message: string;
  code: number;
  balance: NotchPayBalance;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function getBalance(
  currency?: string
): Promise<GetBalanceResponse> {
  const url = new URL("https://api.notchpay.co/balance");
  if (currency) url.searchParams.set("currency", currency);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<GetBalanceResponse>;
}

/*
Usage example:

const result = await getBalance("XAF");

console.log("Available:", result.balance.available, result.balance.currency);
// Use result.balance.available (not total) to check if funds are sufficient
// before initiating a transfer.

// Always verify result.balance.environment === "live" in production
// to avoid acting on sandbox data.
*/
