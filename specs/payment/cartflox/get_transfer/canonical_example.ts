/**
 * @provider Cartflox
 * @capability get_transfer
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type GetTransferInput = {
  id: string;
};

export type GetTransferResponse = {
  id: string;
  reference: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  amount: number;
  currency: string;
  fee: number;
  country: string;
  operator: string;
  provider_operator?: string | null;
  phone: string;
  recipient_name?: string | null;
  description?: string | null;
  provider?: string | null;
  provider_reference?: string | null;
  failure?: {
    code: string | null;
    message: string | null;
  } | null;
  idempotency_key?: string | null;
  livemode: boolean;
  created: string;
  completed?: string | null;
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function getTransfer(
  input: GetTransferInput
): Promise<GetTransferResponse> {
  const response = await fetch(`https://cartflox.com/api/v1/transfers/${input.id}`, {
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

  return (await response.json()) as GetTransferResponse;
}

/*
Usage example:

const t = await getTransfer({ id: transfer.id });
if (t.status === "failed") console.error(t.failure?.code, t.failure?.message);
*/
