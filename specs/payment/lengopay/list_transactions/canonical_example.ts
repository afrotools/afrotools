/**
 * @provider LengoPay
 * @capability list_transactions
 * @atss 1.0
 * @capability_type synchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

interface Transaction {
  pay_id: string;
  date: string;
  amount: number;
  status: string;
}

interface LengoPayError {
  message: string;
}

export async function listTransactions(websiteid: string): Promise<Transaction[]> {
  const response = await fetch(
    "https://portal.lengopay.com/api/v1/transactions",
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
      `LengoPay list transactions error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  return response.json() as Promise<Transaction[]>;
}

/*
Usage example:

const transactions = await listTransactions(LENGOPAY_WEBSITE_ID!);

// Filtrer les paiements réussis uniquement
const successful = transactions.filter(t => t.status === "SUCCESS");
console.log(`${successful.length} paiements réussis sur ${transactions.length} total`);
*/
