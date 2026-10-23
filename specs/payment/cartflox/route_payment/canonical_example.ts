/**
 * @provider Cartflox
 * @capability route_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type RoutePaymentInput = {
  country: string;
  currency?: string;
  amount: number;
  paymentMethod?: "card" | "orange-money" | "wave" | "djamo" | "mtn" | "moov" | "airtel" | "free-money" | "expresso" | "wizall" | "t-money" | "mpesa" | "mobile-money" | "crypto";
  phone?: string;
  availableProviders: Array<"paydunya" | "pawapay" | "flutterwave" | "feexpay" | "paystack" | "cinetpay" | "stripe" | "kkiapay" | "coinbase" | "fedapay" | "notchpay" | "cryptomus" | "qosic" | "monetbill" | "payplus" | "hub2" | "lengopay" | "wave" | "paytech" | "onepay" | "djamo" | "ipay">;
  preferredProvider?: "paydunya" | "pawapay" | "flutterwave" | "feexpay" | "paystack" | "cinetpay" | "stripe" | "kkiapay" | "coinbase" | "fedapay" | "notchpay" | "cryptomus" | "qosic" | "monetbill" | "payplus" | "hub2" | "lengopay" | "wave" | "paytech" | "onepay" | "djamo" | "ipay";
};

export type RoutePaymentResponse = {
  routing: {
    provider: string;
    reason: string;
    alternates: string[];
    confidence: number;
  };
  detectedOperator: "card" | "orange-money" | "wave" | "djamo" | "mtn" | "moov" | "airtel" | "free-money" | "expresso" | "wizall" | "t-money" | "mpesa" | "mobile-money" | "crypto" | null;
  availableMethods: {
    method: "card" | "orange-money" | "wave" | "djamo" | "mtn" | "moov" | "airtel" | "free-money" | "expresso" | "wizall" | "t-money" | "mpesa" | "mobile-money" | "crypto";
    providers: string[];
  }[];
  rankedProviders: {
    provider: string;
    score: number;
  }[];
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function routePayment(
  input: RoutePaymentInput
): Promise<RoutePaymentResponse> {
  const response = await fetch("https://cartflox.com/api/v1/route", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CARTFLOX_SECRET_KEY}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as RoutePaymentResponse;
}

/*
Usage example:

const { routing } = await routePayment({
  country: "SN",
  currency: "XOF",
  amount: 5000,
  phone: "+221701234567",
  availableProviders: ["paydunya", "cinetpay"],
});
console.log(routing.provider, routing.alternates, routing.confidence);
*/
