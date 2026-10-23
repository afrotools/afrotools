/**
 * @provider Cartflox
 * @capability settle_sandbox_session
 * @atss 1.0
 * @capability_type synchronous
 */

export type SettleSandboxSessionInput = {
  transactionId: string;
  issue?: "succes" | "echec";
  customerDetails?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  methodCode?: string;
};

export type SettleSandboxSessionResponse = {
  success: true;
  sandbox: true;
  status: "SUCCESS" | "FAILED";
  message: string;
};

type CartfloxPageError = {
  success: false;
  message: string;
};

export async function settleSandboxSession(
  input: SettleSandboxSessionInput
): Promise<SettleSandboxSessionResponse> {
  const response = await fetch("https://cartflox.com/api/checkout/sandbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<CartfloxPageError>;
    throw new Error(`Cartflox ${response.status}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as SettleSandboxSessionResponse;
}

/*
Usage example:

const session = await createCheckoutSession({ amount: 5000, currency: "XOF" }); // with a test key
await settleSandboxSession({ transactionId: session.id, issue: "succes" });
// Your webhook now receives payment.completed with livemode: false.
*/
