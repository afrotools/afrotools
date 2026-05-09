/**
 * @provider Notch Pay
 * @capability list_countries
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface NotchPayCountry {
  name: string;
  code: string;
}

interface ListCountriesResponse {
  status: string;
  code: number;
  items: NotchPayCountry[];
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listCountries(): Promise<ListCountriesResponse> {
  const response = await fetch("https://api.notchpay.co/countries", {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ListCountriesResponse>;
}

/*
Usage example:

const result = await listCountries();

// Populate a country selector in your checkout form
for (const country of result.items) {
  console.log(`${country.name} (${country.code})`);
}

// Use country.code (not country.name) when filtering channels or initiating payments
// Refresh this list periodically — Notch Pay may expand to new countries
*/
