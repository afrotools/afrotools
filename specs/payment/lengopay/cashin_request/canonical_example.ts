/**
 * @provider LengoPay
 * @capability cashin_request
 * @atss 1.0
 * @capability_type asynchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

interface CashinRequestInput {
  amount: string;
  currency: string;
  websiteid: string;
  type_account: string;
  account: string;
  callback_url?: string;
}

interface CashinRequestResponse {
  status: "Success" | "ERROR";
  pay_id?: string;
  message: string;
}

interface LengoPayError {
  message: string;
}

export async function cashinRequest(
  input: CashinRequestInput
): Promise<CashinRequestResponse> {
  const response = await fetch(
    "https://portal.lengopay.com/api/v2/cashin/request",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error: LengoPayError = await response.json();
    throw new Error(
      `LengoPay cashin error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  return response.json() as Promise<CashinRequestResponse>;
}

/*
Usage example:

const result = await cashinRequest({
  amount: "1000",          // string, pas un number
  currency: "GNF",
  websiteid: LENGOPAY_WEBSITE_ID!,
  type_account: "lp-om-gn", // Orange Money Guinée
  account: "620124578",
  callback_url: "https://myapp.com/callback/cashin",
});

if (result.status === "Success" && result.pay_id) {
  // Conserver pay_id pour suivre la transaction via cashinStatus
  // Le paiement n'est PAS encore effectué à ce stade
  await db.orders.update({ id: orderId }, { pay_id: result.pay_id });
}
*/
