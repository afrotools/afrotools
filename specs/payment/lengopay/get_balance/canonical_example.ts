/**
 * @provider LengoPay
 * @capability get_balance
 * @atss 1.0
 * @capability_type synchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

interface GetBalanceResponse {
  status: string;
  balance: string;
  currency: string;
}

interface LengoPayError {
  message: string;
}

export async function getBalance(websiteId: string): Promise<GetBalanceResponse> {
  const response = await fetch(
    `https://portal.lengopay.com/api/getbalance/${websiteId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const error: LengoPayError = await response.json();
    throw new Error(
      `LengoPay balance error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  return response.json() as Promise<GetBalanceResponse>;
}

/*
Usage example:

const result = await getBalance(LENGOPAY_WEBSITE_ID!);

if (result.status === "Success") {
  // balance est une string — utiliser parseFloat pour les calculs
  const balanceAmount = parseFloat(result.balance);
  console.log(`Solde: ${balanceAmount} ${result.currency}`);
}
*/
