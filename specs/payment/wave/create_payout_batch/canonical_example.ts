/**
 * @provider Wave
 * @capability create_payout_batch
 * @atss 1.0
 * @capability_type asynchronous
 */

const WAVE_API_KEY = process.env.WAVE_API_KEY;
if (!WAVE_API_KEY) throw new Error("Missing env: WAVE_API_KEY");

interface PayoutItem {
  currency: string;
  receive_amount: string;
  mobile: string;
  name?: string;
  national_id?: string;
  client_reference?: string;
  payment_reason?: string;
  aggregated_merchant_id?: string;
}

interface CreatePayoutBatchResponse {
  id: string;
}

interface PayoutBatchStatus {
  id: string;
  status: "processing" | "complete";
  payouts: Array<{
    id: string;
    status: "processing" | "succeeded" | "failed" | "reversed";
    currency: string;
    receive_amount: string;
    fee: string;
    mobile: string;
    name?: string;
    client_reference?: string;
    timestamp: string;
    payout_error?: { error_code: string; error_message?: string };
  }>;
}

interface WaveError {
  code: string;
  message: string;
}

export async function createPayoutBatch(
  payouts: PayoutItem[]
): Promise<CreatePayoutBatchResponse> {
  const response = await fetch("https://api.wave.com/v1/payout-batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WAVE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ payouts }),
  });

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<CreatePayoutBatchResponse>;
}

export async function getPayoutBatch(batchId: string): Promise<PayoutBatchStatus> {
  const response = await fetch(
    `https://api.wave.com/v1/payout-batch/${batchId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${WAVE_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    const error: WaveError = await response.json();
    throw new Error(`Wave error ${response.status}: ${error.message ?? error.code}`);
  }

  return response.json() as Promise<PayoutBatchStatus>;
}

/*
Usage example — envoi de payroll :

// 1. Créer le batch
const batch = await createPayoutBatch([
  { currency: "XOF", receive_amount: "150000", mobile: "+221700000001", name: "Mamadou Diallo", client_reference: "payroll_2024_01_emp_1" },
  { currency: "XOF", receive_amount: "200000", mobile: "+221700000002", name: "Fatoumata Bah",  client_reference: "payroll_2024_01_emp_2" },
  { currency: "XOF", receive_amount: "175000", mobile: "+221700000003", name: "Ibrahima Sow",   client_reference: "payroll_2024_01_emp_3" },
]);

// 2. Stocker le batch.id et attendre le traitement
await db.payrollBatches.create({ wave_batch_id: batch.id, status: "processing" });

// 3. Interroger jusqu'à complétion (via job, webhook, ou polling manuel)
let result: PayoutBatchStatus;
do {
  await new Promise((resolve) => setTimeout(resolve, 5000));
  result = await getPayoutBatch(batch.id);
} while (result.status === "processing");

// 4. Vérifier chaque payout individuellement — 'complete' ≠ tout réussi
for (const payout of result.payouts) {
  if (payout.status === "succeeded") {
    await db.payroll.update({ client_reference: payout.client_reference }, { status: "paid" });
  } else if (payout.status === "failed") {
    console.error(`Payout échoué pour ${payout.mobile} :`, payout.payout_error?.error_code);
    await db.payroll.update({ client_reference: payout.client_reference }, { status: "failed" });
  }
}
*/
