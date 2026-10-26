/**
 * @provider Yango Delivery
 * @capability accept_delivery_claim
 * @atss 1.1
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type AcceptDeliveryClaimInput = {
  claim_id: string;
  version: number;
};

export type AcceptDeliveryClaimResponse = {
  id: string;
  skip_client_notify: boolean;
  status: "new" | "estimating" | "estimating_failed" | "ready_for_approval" | "accepted" | "performer_lookup" | "performer_draft" | "performer_found" | "performer_not_found" | "pickup_arrived" | "ready_for_pickup_confirmation" | "pickuped" | "delivery_arrived" | "ready_for_delivery_confirmation" | "delivered" | "delivered_finish" | "returning" | "return_arrived" | "ready_for_return_confirmation" | "returned" | "returned_finish" | "failed" | "cancelled" | "cancelled_with_payment" | "cancelled_by_taxi" | "cancelled_with_items_on_hands";
  user_request_revision: string;
  version: number;
};

type YangoError = {
  code: "not_found" | "inappropriate_status" | "old_version" | "offer_expired" | "state_mismatch" | "too_many_requests";
  message: string;
};

export async function acceptDeliveryClaim(input: AcceptDeliveryClaimInput): Promise<AcceptDeliveryClaimResponse> {
  const { claim_id, ...body } = input;
  const query = new URLSearchParams({ claim_id });
  const response = await fetch(`https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/claims/accept?${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YANGO_DELIVERY_TOKEN}`,
      "Accept-Language": "en",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<YangoError>;
    throw new Error(`Yango Delivery ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as AcceptDeliveryClaimResponse;
}

/*
Usage example:

const claim = await getDeliveryClaim({ claim_id: claimId }); // status "ready_for_approval"
const accepted = await acceptDeliveryClaim({ claim_id: claim.id, version: claim.version });
console.log(accepted.status); // "accepted": the courier search has started
*/
