/**
 * @provider Notch Pay
 * @capability list_currencies
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface NotchPayCurrency {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
}

interface ListCurrenciesResponse {
  status: string;
  code: number;
  items: NotchPayCurrency[];
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listCurrencies(): Promise<ListCurrenciesResponse> {
  const response = await fetch("https://api.notchpay.co/currencies", {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ListCurrenciesResponse>;
}

/*
Usage example:

const result = await listCurrencies();

// Build a currency map for amount formatting
const currencyMap = Object.fromEntries(
  result.items.map((c) => [c.code, c])
);

const xaf = currencyMap["XAF"];
// xaf.decimal_places === 0 → amounts must be integers for XAF
console.log(`${xaf.symbol} — decimals: ${xaf.decimal_places}`);

// Use currency.code when specifying currency in API calls
// Use currency.symbol and currency.name for display only
*/
