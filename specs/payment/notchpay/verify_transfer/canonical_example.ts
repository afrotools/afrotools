/**
 * @provider Notch Pay
 * @capability verify_transfer
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PRIVATE_KEY = process.env.NOTCHPAY_PRIVATE_KEY;
if (!NOTCHPAY_PRIVATE_KEY) throw new Error("Missing env: NOTCHPAY_PRIVATE_KEY");
const NOTCHPAY_GRANT_TOKEN = process.env.NOTCHPAY_GRANT_TOKEN;
if (!NOTCHPAY_GRANT_TOKEN) throw new Error("Missing env: NOTCHPAY_GRANT_TOKEN");

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

interface VerifyTransferResponse {
  status: string;
  message: string;
  code: number;
  transfer: NotchPayTransfer;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function verifyTransfer(
  reference: string
): Promise<VerifyTransferResponse> {
  const response = await fetch(
    `https://api.notchpay.co/transfers/${reference}`,
    {
      method: "GET",
      headers: {
        Authorization: NOTCHPAY_PRIVATE_KEY!,
        "X-Grant": NOTCHPAY_GRANT_TOKEN!,
      },
    }
  );

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<VerifyTransferResponse>;
}

/*
Usage example:

const result = await verifyTransfer("trx_abc123");

if (result.transfer.status === "complete") {
  // Safe to record disbursement as successful
} else if (result.transfer.status === "failed") {
  // Handle failure — retry or notify the recipient
} else {
  // Still pending — check again later
}
*/
