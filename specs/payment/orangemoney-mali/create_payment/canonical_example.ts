/**
 * @provider Orange Money
 * @capability create_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const ORANGE_MONEY_BASIC_TOKEN = process.env.ORANGE_MONEY_BASIC_TOKEN;
const ORANGE_MONEY_MERCHANT_KEY = process.env.ORANGE_MONEY_MERCHANT_KEY;
if (!ORANGE_MONEY_BASIC_TOKEN) throw new Error("Missing env: ORANGE_MONEY_BASIC_TOKEN");
if (!ORANGE_MONEY_MERCHANT_KEY) throw new Error("Missing env: ORANGE_MONEY_MERCHANT_KEY");

const ORANGE_MONEY_BASE_URL = "https://api.orange.com";
const ORANGE_MONEY_TOKEN_PATH = "/oauth/v3/token";
const ORANGE_MONEY_WEBPAYMENT_PATH = "/orange-money-webpay/ml/v1/webpayment";

interface CreatePaymentInput {
  orderId: string;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
  notifUrl: string;
  currency?: string;
  lang?: string;
  reference?: string;
}

interface CreatePaymentResponse {
  status: number;
  message: string;
  pay_token: string;
  payment_url: string;
  notif_token: string;
}

interface OrangeMoneyError {
  code?: number | string;
  message?: string;
  description?: string;
}

interface OAuthTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

async function getAccessToken(): Promise<string> {
  const tokenUrl = `${ORANGE_MONEY_BASE_URL}${ORANGE_MONEY_TOKEN_PATH}`;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${ORANGE_MONEY_BASIC_TOKEN}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Orange Money OAuth failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as OAuthTokenResponse;
  if (!data.access_token) {
    throw new Error("No access_token in Orange Money OAuth response");
  }
  return data.access_token;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResponse> {
  const accessToken = await getAccessToken();

  const paymentUrl = `${ORANGE_MONEY_BASE_URL}${ORANGE_MONEY_WEBPAYMENT_PATH}`;
  const response = await fetch(paymentUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      merchant_key: ORANGE_MONEY_MERCHANT_KEY,
      currency: input.currency ?? "XOF",
      order_id: input.orderId,
      amount: input.amount,
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      notif_url: input.notifUrl,
      lang: input.lang ?? "fr",
      reference: input.reference ?? input.orderId,
    }),
  });

  if (!response.ok) {
    let err: OrangeMoneyError = {};
    try {
      err = (await response.json()) as OrangeMoneyError;
    } catch {
      // body not JSON — fall through with empty err
    }
    throw new Error(
      `Orange Money create_payment error ${response.status}: ${
        err.message ?? err.description ?? "unknown error"
      }`
    );
  }

  const data = (await response.json()) as CreatePaymentResponse;
  if (!data.payment_url || !data.notif_token) {
    throw new Error(
      "Orange Money response missing payment_url or notif_token"
    );
  }
  return data;
}

/*
Usage example:

const session = await createPayment({
  orderId: `ORD-${Date.now()}`,   // MUST be unique — reusing returns HTTP 403
  amount: 1000,                   // 1 000 XOF (no decimals)
  currency: "XOF",
  returnUrl: "https://myapp.com/payment/success",
  cancelUrl: "https://myapp.com/payment/cancel",
  notifUrl: "https://myapp.com/api/orange-money/webhook",
  lang: "fr",
  reference: "Order ORD-1234",
});

// Persist BEFORE redirecting — needed to reconcile the asynchronous notification
await db.orders.update(
  { id: orderId },
  {
    om_pay_token: session.pay_token,
    om_notif_token: session.notif_token,  // used to authenticate the webhook
  }
);

// Redirect the user to the hosted Orange Money payment page
// res.redirect(session.payment_url);

// Never fulfill the order on the return_url alone — wait for the
// notif_url callback and verify it using the stored notif_token.
*/
