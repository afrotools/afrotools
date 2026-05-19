/**
 * @provider PayGate
 * @capability disburse
 * @atss 1.0
 * @capability_type asynchronous
 */

const PAYGATE_AUTH_TOKEN = process.env.PAYGATE_AUTH_TOKEN;
if (!PAYGATE_AUTH_TOKEN) throw new Error("Missing env: PAYGATE_AUTH_TOKEN");

const PAYGATE_BASE_URL = "https://paygateglobal.com/api";

type PayGateNetwork = "FLOOZ" | "TMONEY";

interface DisburseInput {
  phone_number: string;
  amount: number;
  reason: string;
  network: PayGateNetwork;
  reference?: string;
}

interface DisburseResponse {
  tx_reference: string;
  status: number;
}

export async function disburse(input: DisburseInput): Promise<DisburseResponse> {
  const response = await fetch(`${PAYGATE_BASE_URL}/v1/disburse`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_token: PAYGATE_AUTH_TOKEN,
      phone_number: input.phone_number,
      amount: input.amount,
      reason: input.reason,
      network: input.network,
      ...(input.reference && { reference: input.reference }),
    }),
  });

  if (!response.ok) {
    throw new Error(`PayGate disburse HTTP error: ${response.status}`);
  }

  const raw = (await response.json()) as { tx_reference: string | number; status: number };

  if (raw.status !== 200) {
    throw new Error(
      `PayGate disburse refused: status=${raw.status} (200 = accepted; any other value = refused)`
    );
  }

  return {
    tx_reference: String(raw.tx_reference),
    status: raw.status,
  };
}

/*
Usage example:

const payout = await disburse({
  phone_number: "96123456",
  amount: 10000,
  reason: "Seller payout — order ORDER-A3B7K9",
  network: "FLOOZ",
  reference: "PAYOUT-A3B7K9",
});

// payout.status === 200 means PayGate accepted the request and queued the transfer.
// The customer's wallet is credited asynchronously — re-poll check_payment_status
// with identifier = "PAYOUT-A3B7K9" until status = 0 to confirm settlement.
//
// Reminder: this endpoint requires IP whitelisting in your PayGate dashboard.
*/
