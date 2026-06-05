/**
 * @provider Bictorys
 * @capability create_charge
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CustomerObject {
  name?: string;
  phone?: number;
  email?: string;
  country: string;
  locale?: string;
}

interface CreateChargeInput {
  amount?: number;
  currency?: string;
  country?: string;
  paymentReference?: string;
  merchantReference?: string;
  successRedirectUrl?: string;
  errorRedirectUrl?: string;
  invoiceId?: string;
  paymentLinkId?: string;
  orderId?: string;
  customerId?: string;
  customerObject?: CustomerObject;
  authorization?: boolean;
  allowUpdateCustomer?: boolean;
  deviceId?: string;
}

interface ConfirmationLinkObject {
  transactionId: string;
  redirectUrl?: string;
  merchantReference?: string;
  type: "MobilePaymentObject" | "CardPaymentObject";
  link?: string;
  qrCode?: string;
  message?: string;
  state?: "AWAIT_3DS" | "PURCHASED" | "CAPTURED" | "AUTHORIZED" | "FAILED" | "DECLINED";
}

interface CheckoutLinkObject {
  type: "CheckoutLinkObject";
  link: string;
  chargeId: string;
  opToken: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export type CreateChargeResponse = ConfirmationLinkObject | CheckoutLinkObject;

export async function createCharge(
  input: CreateChargeInput,
  paymentType?: string
): Promise<CreateChargeResponse> {
  const baseUrl = "https://api.bictorys.com/pay/v1/charges";
  const url = paymentType ? baseUrl + "?payment_type=" + paymentType : baseUrl;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": BICTORYS_SECRET_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<CreateChargeResponse>;
}

/*
Usage example — hosted checkout (no payment_type, customer picks on Bictorys page):

const result = await createCharge({
  amount: 5000,
  currency: "XOF",
  country: "SN",
  paymentReference: "order_123",
  successRedirectUrl: "https://myapp.com/payment/success",
  errorRedirectUrl: "https://myapp.com/payment/error",
  customerObject: { name: "Mamadou Diallo", phone: 221700000000, country: "SN" },
});
// result is CheckoutLinkObject (HTTP 202)
// Store result.chargeId, then redirect customer to result.link
// Verify server-side via verifyTransaction(result.chargeId) before fulfilling.

---

Usage example — direct mobile money (payment_type specified):

const result = await createCharge(
  {
    amount: 100000,
    currency: "GNF",
    country: "GN",
    paymentReference: "order_456",
    successRedirectUrl: "https://myapp.com/payment/success",
    errorRedirectUrl: "https://myapp.com/payment/error",
    customerObject: { name: "Aissatou Barry", phone: 224620000000, country: "GN" },
  },
  "orange_money"
);
// result is ConfirmationLinkObject (HTTP 201)
// Store result.transactionId, then redirect customer to result.redirectUrl
// Verify server-side via verifyTransaction(result.transactionId) before fulfilling.
*/
