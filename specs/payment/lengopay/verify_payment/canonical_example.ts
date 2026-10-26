/**
 * @provider LengoPay
 * @capability verify_payment
 * @atss 1.1
 * @capability_type synchronous
 */

const LENGOPAY_LICENSE_KEY = process.env.LENGOPAY_LICENSE_KEY;
if (!LENGOPAY_LICENSE_KEY) throw new Error("Missing env: LENGOPAY_LICENSE_KEY");

const LENGOPAY_WEBSITE_ID = process.env.LENGOPAY_WEBSITE_ID;
if (!LENGOPAY_WEBSITE_ID) throw new Error("Missing env: LENGOPAY_WEBSITE_ID");

type PaymentStatus = "SUCCESS" | "FAILED" | "PENDING";

interface VerifyPaymentInput {
  pay_id: string;
  websiteid: string;
}

interface VerifyPaymentResponse {
  pay_id: string;
  status: PaymentStatus;
  amount: number;
  date: string;
}

interface LengoPayError {
  message: string;
}

export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResponse> {
  const response = await fetch(
    "https://portal.lengopay.com/api/v1/transaction/status",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${LENGOPAY_LICENSE_KEY!}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
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

const result = await verifyPayment({
  pay_id: "WTVWaTBOUXVlNTB1NXNzbUhldGF0eENSV3VkeTJuV3E=",
  websiteid: LENGOPAY_WEBSITE_ID!,
});

if (result.status === "SUCCESS") {
  // Safe to fulfill the order
  await db.orders.update({ pay_id: result.pay_id }, { status: "paid" });
} else if (result.status === "PENDING") {
  // Payment still in progress — wait for webhook or retry later
}
*/
