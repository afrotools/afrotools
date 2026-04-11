/**
 * @provider LengoPay
 * @capability list_cashin_transactions
 * @atss 1.0
 * @capability_type synchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

interface CashinTransaction {
  pay_id: string;
  date: string;
  amount: number;
  account: string;
  gateway: string;
  status: string;
}

interface LengoPayError {
  message: string;
}

export async function listCashinTransactions(
  websiteid: string
): Promise<CashinTransaction[]> {
  const response = await fetch(
    "https://portal.lengopay.com/api/v1/cashin/all-transactions",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ websiteid }),
    }
  );

  if (!response.ok) {
    const error: LengoPayError = await response.json();
    throw new Error(
      `LengoPay list cashin transactions error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  const data = await response.json() as CashinTransaction[];

  // Normaliser account en string (l'API peut retourner un number)
  return data.map(t => ({ ...t, account: String(t.account) }));
}

/*
Usage example:

const transactions = await listCashinTransactions(LENGOPAY_WEBSITE_ID!);

// Grouper par réseau
const byGateway = transactions.reduce<Record<string, CashinTransaction[]>>((acc, t) => {
  acc[t.gateway] = acc[t.gateway] ?? [];
  acc[t.gateway].push(t);
  return acc;
}, {});

console.log("Transactions par réseau:", Object.keys(byGateway));
*/
