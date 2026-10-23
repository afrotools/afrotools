/**
 * @provider Cartflox
 * @capability check_payment_link_status
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type CheckPaymentLinkStatusInput = {
  id: string;
};

export type CheckPaymentLinkStatusResponse = {
  success: true;
  paid: boolean;
  status: "SUCCESS" | "WAITING" | "PENDING" | "CANCELLED" | "REFUNDED";
  transaction?: {
    id: string;
    amount: number;
    customerName?: string | null;
    customerEmail?: string | null;
  };
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function checkPaymentLinkStatus(
  input: CheckPaymentLinkStatusInput
): Promise<CheckPaymentLinkStatusResponse> {
  const response = await fetch(`https://cartflox.com/api/v1/payment-links/${input.id}/check`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CARTFLOX_SECRET_KEY}`,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxError>;
    // Transfer endpoints, webhook resends and test-mode refusals add a stable `code`.
    const code = error.code ? ` (${error.code})` : "";
    throw new Error(`Cartflox ${response.status}${code}: ${error.error ?? response.statusText}`);
  }

  return (await response.json()) as CheckPaymentLinkStatusResponse;
}

/*
Usage example:

const check = await checkPaymentLinkStatus({ id: link.id });
if (check.paid) console.log("Paid", check.transaction?.amount);
*/
