/**
 * @provider PayGate
 * @capability initiate_payment
 * @atss 1.0
 * @capability_type asynchronous
 */

const PAYGATE_AUTH_TOKEN = process.env.PAYGATE_AUTH_TOKEN;
if (!PAYGATE_AUTH_TOKEN) throw new Error("Missing env: PAYGATE_AUTH_TOKEN");

const PAYGATE_BASE_URL = "https://paygateglobal.com/api";

type PayGateNetwork = "FLOOZ" | "TMONEY";

interface InitiatePaymentInput {
  phone_number: string;
  amount: number;
  identifier: string;
  network: PayGateNetwork;
  description?: string;
}

interface InitiatePaymentResponse {
  tx_reference: string;
  status: 0 | 2 | 4 | 6;
}

export async function initiatePayment(
  input: InitiatePaymentInput
): Promise<InitiatePaymentResponse> {
  const response = await fetch(`${PAYGATE_BASE_URL}/v1/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_token: PAYGATE_AUTH_TOKEN,
      phone_number: input.phone_number,
      amount: input.amount,
      identifier: input.identifier,
      network: input.network,
      ...(input.description && { description: input.description }),
    }),
  });

  if (!response.ok) {
    throw new Error(`PayGate initiate_payment HTTP error: ${response.status}`);
  }

  const raw = (await response.json()) as { tx_reference: string | number; status: number };

  if (raw.status !== 0) {
    throw new Error(
      `PayGate initiate_payment rejected: status=${raw.status} ` +
        `(2=invalid token, 4=invalid parameters, 6=duplicate identifier)`
    );
  }

  return {
    tx_reference: String(raw.tx_reference),
    status: raw.status as 0 | 2 | 4 | 6,
  };
}

/*
Usage example:

const ack = await initiatePayment({
  phone_number: "90123456",
  amount: 5000,
  identifier: "ORDER-A3B7K9",
  network: "TMONEY",
  description: "Order #ORDER-A3B7K9",
});

// ack.status === 0 means PayGate registered the request and pushed a USSD prompt
// to the customer's phone. The payment is NOT yet completed.
// Persist ack.tx_reference and your identifier, then poll check_payment_status
// (/api/v2/status) by identifier to learn the actual payment outcome.
*/
