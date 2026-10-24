/**
 * @provider Yango Delivery
 * @capability cancel_delivery_claim
 * @atss 1.0
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type CancelDeliveryClaimInput = {
  claim_id: string;
  cancel_state: "free" | "paid";
  version: number;
};

export type CancelDeliveryClaimResponse = {
  id: string;
  skip_client_notify: boolean;
  status: "new" | "estimating" | "estimating_failed" | "ready_for_approval" | "accepted" | "performer_lookup" | "performer_draft" | "performer_found" | "performer_not_found" | "pickup_arrived" | "ready_for_pickup_confirmation" | "pickuped" | "delivery_arrived" | "ready_for_delivery_confirmation" | "delivered" | "delivered_finish" | "returning" | "return_arrived" | "ready_for_return_confirmation" | "returned" | "returned_finish" | "failed" | "cancelled" | "cancelled_with_payment" | "cancelled_by_taxi" | "cancelled_with_items_on_hands";
  user_request_revision: string;
  version: number;
};

type YangoError = {
  code: "bad_request" | "not_found" | "inappropriate_status" | "free_cancel_is_unavailable" | "state_mismatch";
  message: string;
};

export async function cancelDeliveryClaim(input: CancelDeliveryClaimInput): Promise<CancelDeliveryClaimResponse> {
  const { claim_id, ...body } = input;
  const query = new URLSearchParams({ claim_id });
  const response = await fetch(`https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/claims/cancel?${query}`, {
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

  return (await response.json()) as CancelDeliveryClaimResponse;
}

/*
Usage example:

const claim = await getDeliveryClaim({ claim_id: claimId });
const terms = await getCancellationTerms({ claim_id: claimId });
if (terms.cancel_state === "unavailable") {
  // Not described by the reference: don't call cancel. Once the items are picked up, only the support service can cancel.
} else {
  const cancelled = await cancelDeliveryClaim({ claim_id: claimId, cancel_state: terms.cancel_state, version: claim.version });
  console.log(cancelled.status);
}
*/
