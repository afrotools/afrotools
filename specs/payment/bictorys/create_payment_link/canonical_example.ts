/**
 * @provider Bictorys
 * @capability create_payment_link
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CreatePaymentLinkInput {
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
  dueDate?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
  redirectUrlAfterPayment?: string;
  enableMultiplePayment?: boolean;
  enableCardPaymentOnly?: boolean;
  cashier?: string;
  deviceId?: string;
}

interface CreatePaymentLinkResponse {
  id: string;
  paymentUrl: string;
  amount: number;
  currency: string;
  reference?: string;
  description?: string;
  dueDate?: string;
  enableMultiplePayment?: boolean;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<CreatePaymentLinkResponse> {
  const response = await fetch(
    "https://api.bictorys.com/paymentlink-management/v1/paymentlinks",
    {
      method: "POST",
      headers: {
        "X-API-Key": BICTORYS_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<CreatePaymentLinkResponse>;
}

/*
Usage example:

const link = await createPaymentLink({
  amount: 25000,
  currency: "XOF",
  description: "Abonnement mensuel — Janvier 2026",
  reference: "SUB-2026-01",
  dueDate: "2026-07-15",
  redirectUrlAfterPayment: "https://myapp.com/subscription/confirmed",
  enableMultiplePayment: false, // single-use link
});

console.log("Share this URL with the customer:", link.paymentUrl);

// To charge via API instead of sharing the URL:
// await createCharge({ paymentLinkId: link.id, country: "SN" });
*/
