/**
 * @provider Notch Pay
 * @capability process_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const NOTCHPAY_PUBLIC_KEY = process.env.NOTCHPAY_PUBLIC_KEY;
if (!NOTCHPAY_PUBLIC_KEY) throw new Error("Missing env: NOTCHPAY_PUBLIC_KEY");

interface ProcessPaymentData {
  phone?: string;
  account_number?: string;
  country?: string;
}

interface ProcessPaymentInput {
  reference: string;
  channel: string;
  data?: ProcessPaymentData;
  client_ip?: string;
}

interface NotchPayTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
}

interface ProcessPaymentResponse {
  status: string;
  message: string;
  code: number;
  transaction: NotchPayTransaction;
}

interface NotchPayError {
  code: number;
  message: string;
}

export async function processPayment(
  input: ProcessPaymentInput
): Promise<ProcessPaymentResponse> {
  const { reference, channel, data, client_ip } = input;

  const response = await fetch(
    `https://api.notchpay.co/payments/${reference}`,
    {
      method: "POST",
      headers: {
        Authorization: NOTCHPAY_PUBLIC_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel, data, client_ip }),
    }
  );

  if (!response.ok) {
    const error: NotchPayError = await response.json();
    throw new Error(`Notch Pay error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<ProcessPaymentResponse>;
}

/*
Usage example:

// After calling create_payment and obtaining the reference:
const result = await processPayment({
  reference: "order_123",
  channel: "cm.mtn",
  data: { phone: "+237670000000" },
});

console.log(result.transaction.status); // typically "pending"

// A 200/Accepted response only means the request was submitted to the mobile operator.
// Always call verifyPayment(reference) afterwards to check the final status
// before fulfilling the order.
*/
