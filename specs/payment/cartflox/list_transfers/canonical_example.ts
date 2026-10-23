/**
 * @provider Cartflox
 * @capability list_transfers
 * @atss 1.0
 * @capability_type synchronous
 */

const CARTFLOX_SECRET_KEY = process.env.CARTFLOX_SECRET_KEY;
if (!CARTFLOX_SECRET_KEY) throw new Error("Missing env: CARTFLOX_SECRET_KEY");

export type ListTransfersInput = {
  options?: string;
  status?: "pending" | "processing" | "succeeded" | "failed";
  limit?: number;
};

export type ListTransfersResponse = {
  data: {
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
  }[];
  count: number;
} | {
  countries: {
    code: string;
    name: string;
    currency: string;
    operators: {
      code: "orange_money" | "mtn_money" | "moov_money" | "wave" | "free_money" | "emoney" | "expresso" | "djamo" | "tmoney" | "celtiis" | "mpesa" | "airtel_money" | "tigo_pesa" | "halopesa" | "vodacom" | "zamtel" | "vodafone_cash" | "airtel_tigo" | "express_union" | "mobicash";
      name: string;
      provider: string;
    }[];
  }[];
};

type CartfloxError = {
  error: string;
  code?: string;
};

export async function listTransfers(
  input: ListTransfersInput
): Promise<ListTransfersResponse> {
  const query = new URLSearchParams();
  if (input.options !== undefined) query.set("options", String(input.options));
  if (input.status !== undefined) query.set("status", String(input.status));
  if (input.limit !== undefined) query.set("limit", String(input.limit));
  const qs = query.toString();
  const response = await fetch(`https://cartflox.com/api/v1/transfers${qs ? `?${qs}` : ""}`, {
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

  return (await response.json()) as ListTransfersResponse;
}

/*
Usage example:

const list = await listTransfers({ status: "processing", limit: 50 });
const options = await listTransfers({ options: "1" });
*/
