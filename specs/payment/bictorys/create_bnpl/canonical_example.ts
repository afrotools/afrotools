/**
 * @provider Bictorys
 * @capability create_bnpl
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface BnplItem {
  name: string;
  price: number;
  quantity: number;
  reference?: string;
  taxRate?: number;
  discount?: number;
}

interface CreateBnplInput {
  currency: string;
  startDate: string;
  nbrInstallments: number;
  customerId: string;
  reference?: string;
  amount?: number;
  orderDetails?: BnplItem[];
  deposit?: number;
  installmentIntervalDays?: number;
  customerMessage?: string;
  notificationChannel?: "email" | "sms" | "whatsApp" | "none";
}

interface BnplResponse {
  id: string;
  nextInstallmentDueDate?: string;
  nbrPaidInstallments?: number;
  nbrUnpaidInstallments?: number;
  customerName?: string;
  currentInstallmentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createBnpl(input: CreateBnplInput): Promise<BnplResponse> {
  const response = await fetch(
    "https://api.bictorys.com/billing/v1/bnpl",
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

  return response.json() as Promise<BnplResponse>;
}

/*
Usage example — a smartphone in 3 monthly payments with a 20 000 XOF deposit:

const bnpl = await createBnpl({
  currency: "XOF",
  startDate: "2026-07-01",        // first installment date
  nbrInstallments: 3,
  customerId: "fbd2053b-638d-4133-957e-3caf63e6b79c",
  reference: "ORDER-PHONE-001",
  amount: 200000,                  // total purchase price
  deposit: 20000,                  // upfront payment; remaining 180 000 XOF split in 3
  installmentIntervalDays: 30,     // monthly
  notificationChannel: "sms",
  customerMessage: "Votre mensualité smartphone est due.",
});

console.log("BNPL plan created:", bnpl.id);
console.log("Next installment:", bnpl.nextInstallmentDueDate);
// Each installment = (200 000 - 20 000) / 3 = 60 000 XOF
// Bictorys charges automatically — no manual action needed per installment.
*/
