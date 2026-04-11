/**
 * @provider LengoPay
 * @capability cashin_status
 * @atss 1.0
 * @capability_type synchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

type CashinPaymentStatus = "SUCCESS" | "FAILED" | "PENDING";

interface CashinStatusInput {
  pay_id: string;
  websiteid: string;
}

interface CashinStatusResponse {
  status: CashinPaymentStatus;
  pay_id: string;
  amount: number;
  account: string;
  date: string;
}

interface LengoPayError {
  message: string;
}

export async function cashinStatus(
  input: CashinStatusInput
): Promise<CashinStatusResponse> {
  const response = await fetch(
    "https://portal.lengopay.com/api/v2/cashin/transaction",
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
      `LengoPay cashin status error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  return response.json() as Promise<CashinStatusResponse>;
}

/*
Usage example:

const result = await cashinStatus({
  pay_id: "elNZc1FUZzduVzhQcjlYVWtkZ2pmVmRac1Z5anUxUG8=",
  websiteid: LENGOPAY_WEBSITE_ID!,
});

if (result.status === "SUCCESS") {
  // Paiement confirmé — fulfiller la commande
  await db.orders.update({ pay_id: result.pay_id }, { status: "paid" });
} else if (result.status === "PENDING") {
  // En cours — réessayer plus tard ou attendre le callback
}
*/
