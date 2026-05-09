/**
 * @provider Notch Pay
 * @capability list_channels
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface NotchPayChannel {
  id: string;
  name: string;
  slug: string;
  logo: string;
  countries: string[];
  currency: string;
  type: string;
  min_amount: number;
  max_amount: number;
}

interface ListChannelsResponse {
  status: string;
  code: number;
  items: NotchPayChannel[];
}

interface ListChannelsParams {
  country?: string;
  amount?: number;
  currency?: string;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function listChannels(
  params: ListChannelsParams = {}
): Promise<ListChannelsResponse> {
  const url = new URL("https://api.notchpay.co/channels");
  if (params.country) url.searchParams.set("country", params.country);
  if (params.amount !== undefined)
    url.searchParams.set("amount", String(params.amount));
  if (params.currency) url.searchParams.set("currency", params.currency);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: NOTCHPAY_PUBLIC_KEY!,
    },
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ListChannelsResponse>;
}

/*
Usage example:

// List channels available in Cameroon for an amount of 5000 XAF
const result = await listChannels({ country: "CM", amount: 5000, currency: "XAF" });

for (const channel of result.items) {
  console.log(`${channel.name} (${channel.slug}): ${channel.min_amount}–${channel.max_amount} ${channel.currency}`);
}

// Use channel.slug (not channel.id) when initiating a payment
// Always check min_amount and max_amount before presenting a channel to the user
*/
