/**
 * @provider Yango Delivery
 * @capability get_claims_journal
 * @atss 1.1
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type GetClaimsJournalInput = {
  cursor?: string;
};

export type GetClaimsJournalResponse = {
  cursor: string;
  events: {
    change_type: string;
    claim_id: string;
    operation_id: number;
    revision: number;
    updated_ts: string;
    client_id?: string;
    current_point_id?: number;
    new_currency?: string;
    new_price?: string;
    new_status?: "new" | "estimating" | "estimating_failed" | "ready_for_approval" | "accepted" | "performer_lookup" | "performer_draft" | "performer_found" | "performer_not_found" | "pickup_arrived" | "ready_for_pickup_confirmation" | "pickuped" | "delivery_arrived" | "ready_for_delivery_confirmation" | "delivered" | "delivered_finish" | "returning" | "return_arrived" | "ready_for_return_confirmation" | "returned" | "returned_finish" | "failed" | "cancelled" | "cancelled_with_payment" | "cancelled_by_taxi" | "cancelled_with_items_on_hands";
    resolution?: "success" | "failed";
  }[];
};

type YangoError = {
  code: "invalid_cursor" | "too_many_requests";
  message: string;
};

export async function getClaimsJournal(input: GetClaimsJournalInput): Promise<GetClaimsJournalResponse> {
  const response = await fetch("https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/claims/journal", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YANGO_DELIVERY_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<YangoError>;
    throw new Error(`Yango Delivery ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetClaimsJournalResponse;
}

/*
Usage example:

let cursor: string | undefined; // persist it between runs (database, KV store)
const journal = await getClaimsJournal(cursor ? { cursor } : {});
for (const event of journal.events) {
  if (event.change_type === "status_changed") console.log(event.claim_id, event.new_status, event.resolution);
}
cursor = journal.cursor;
*/
