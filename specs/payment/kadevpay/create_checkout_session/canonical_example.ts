/**
 * @provider KadevPay
 * @capability create_checkout_session
 * @atss 1.0
 * @capability_type sdk
 */

const KADEVPAY_PUBLIC_KEY = process.env.KADEVPAY_PUBLIC_KEY;
if (!KADEVPAY_PUBLIC_KEY) throw new Error("Missing env: KADEVPAY_PUBLIC_KEY");

interface CheckoutSessionInput {
  amount: number;
  email: string;
  method: "momo" | "card";
  name?: string;
  phone?: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

interface CheckoutSessionConfig extends CheckoutSessionInput {
  public_key: string;
}

export function buildCheckoutConfig(input: CheckoutSessionInput): CheckoutSessionConfig {
  return {
    ...input,
    public_key: KADEVPAY_PUBLIC_KEY as string,
  };
}

/*
Usage example:

// 1. Include the KadevPay SDK in your HTML:
// <script src="https://pay.kadev.ci/js/v1/kadev-pay.js"></script>

// 2. Build the config (server-side, pass it to the frontend):
const config = buildCheckoutConfig({
  amount: 5000,                              // in XOF (FCFA)
  email: "client@email.com",
  method: "momo",                            // "momo" or "card"
  name: "Jean Dupont",
  callback_url: "https://myapp.com/payment/callback",
  metadata: { order_id: "CMD-9982" },
});

// 3. On the client, invoke the SDK:
// KadevPay.checkout({
//   ...config,
//   onSuccess: (reference: string) => {
//     // Save the reference and verify server-side before fulfilling the order
//     fetch("/api/verify-payment", {
//       method: "POST",
//       body: JSON.stringify({ reference }),
//     });
//   },
//   onClose: () => { console.log("Checkout closed by user"); },
// });
*/
