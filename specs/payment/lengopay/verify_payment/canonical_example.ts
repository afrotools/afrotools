/**
 * @provider LengoPay
 * @capability verify_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

type PaymentStatus = "SUCCESS" | "FAILED" | "PENDING" | "CANCELLED";

interface VerifyPaymentResponse {
  pay_id: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface LengoPayError {
  message: string;
}

function isPaid(status: PaymentStatus): boolean {
  return status === "SUCCESS";
}

export async function verifyPayment(payId: string): Promise<VerifyPaymentResponse> {
  const response = await fetch(
    `https://portal.lengopay.com/api/v1/payments/${payId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
        Accept: "application/json",
      },
    }
  );

  if (!response.ok) {
    const error: LengoPayError = await response.json();
    throw new Error(
      `LengoPay verify error ${response.status}: ${error.message ?? "Unknown error"}`
    );
  }

  return response.json() as Promise<VerifyPaymentResponse>;
}

/*
Usage example:

const result = await verifyPayment("WTVWaTBOUXVlNTB1NXNzbUhldGF0eENSV3VkeTJuV3E=");

if (isPaid(result.status)) {
  // Safe to fulfill the order
  const orderId = (result.metadata as { orderId?: string })?.orderId;
  await db.orders.update({ id: orderId }, { status: "paid" });
} else if (result.status === "PENDING") {
  // Payment still in progress — wait for webhook or retry later
}
*/
