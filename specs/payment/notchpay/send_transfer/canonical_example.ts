/**
 * @provider Notch Pay
 * @capability send_transfer
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");
const NOTCHPAY_GRANT_TOKEN = process.env.NOTCHPAY_GRANT_TOKEN;
if (!NOTCHPAY_GRANT_TOKEN) throw new Error("Missing env: NOTCHPAY_GRANT_TOKEN");

interface SendTransferInput {
  amount: number;
  currency: string;
  description: string;
  beneficiary?: string;
  recipient?: string;
  channel?: string;
  reference?: string;
}

interface NotchPayTransfer {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  beneficiary: string;
  created_at: string;
  completed_at: string;
}

interface SendTransferResponse {
  status: string;
  message: string;
  code: number;
  transfer: NotchPayTransfer;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function sendTransfer(
  input: SendTransferInput
): Promise<SendTransferResponse> {
  const response = await fetch("https://api.notchpay.co/transfers", {
    method: "POST",
    headers: {
      Authorization: NOTCHPAY_PRIVATE_KEY!,
      "X-Grant": NOTCHPAY_GRANT_TOKEN!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<SendTransferResponse>;
}

/*
Usage example:

// Using a saved beneficiary ID:
const result = await sendTransfer({
  amount: 10000,
  currency: "XAF",
  description: "Payout for order #456",
  beneficiary: "ben_abc123",
});

// Or using a recipient phone number + channel:
const result = await sendTransfer({
  amount: 10000,
  currency: "XAF",
  description: "Payout for order #456",
  recipient: "+237670000000",
  channel: "cm.mtn",
});

// Store result.transfer.reference to call verify_transfer later.
// Initial status is "pending" — do not record as complete until verified.
*/
