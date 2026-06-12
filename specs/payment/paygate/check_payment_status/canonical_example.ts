/**
 * @provider PayGate
 * @capability check_payment_status
 * @atss 1.0
 * @capability_type synchronous
 */

const PAYGATE_AUTH_TOKEN = process.env.PAYGATE_AUTH_TOKEN;
if (!PAYGATE_AUTH_TOKEN) throw new Error("Missing env: PAYGATE_AUTH_TOKEN");

const PAYGATE_BASE_URL = "https://paygateglobal.com/api";

type PayGatePaymentStatus = 0 | 2 | 4 | 6;
type PayGatePaymentMethod = "FLOOZ" | "T-Money";

interface CheckPaymentStatusInput {
  identifier: string;
}

interface CheckPaymentStatusResponse {
  tx_reference: string;
  identifier: string;
  payment_reference: string;
  status: PayGatePaymentStatus;
  datetime: string;
  payment_method: PayGatePaymentMethod;
}

export async function checkPaymentStatus(
  input: CheckPaymentStatusInput
): Promise<CheckPaymentStatusResponse> {
  const response = await fetch(`${PAYGATE_BASE_URL}/v2/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_token: PAYGATE_AUTH_TOKEN,
      identifier: input.identifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`PayGate check_payment_status HTTP error: ${response.status}`);
  }

  const raw = (await response.json()) as {
    tx_reference: string | number;
    identifier: string;
    payment_reference: string | number;
    status: number;
    datetime: string;
    payment_method: PayGatePaymentMethod;
  };

  return {
    tx_reference: String(raw.tx_reference ?? ""),
    identifier: raw.identifier,
    payment_reference: String(raw.payment_reference ?? ""),
    status: raw.status as PayGatePaymentStatus,
    datetime: raw.datetime,
    payment_method: raw.payment_method,
  };
}

/*
Usage example:

const status = await checkPaymentStatus({ identifier: "ORDER-A3B7K9" });

switch (status.status) {
  case 0: // Paid
    // Fulfill the order. Store status.payment_reference for support / reconciliation.
    break;
  case 2: // Pending — customer has not validated the USSD yet
    // Re-poll in a few seconds.
    break;
  case 4: // Expired
  case 6: // Cancelled
    // Mark the order as failed.
    break;
}
*/
