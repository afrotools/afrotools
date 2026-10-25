/**
 * @provider Yango Delivery
 * @capability get_tracking_links
 * @atss 1.1
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type GetTrackingLinksInput = {
  claim_id: string;
};

export type GetTrackingLinksResponse = {
  route_points: {
    id: number;
    type: "source" | "destination" | "return";
    visit_order: number;
    sharing_link?: string;
  }[];
};

type YangoError = {
  code: "not_found" | "unknown_tracking_links" | "inappropriate_status" | "too_many_requests";
  message: string;
};

export async function getTrackingLinks(input: GetTrackingLinksInput): Promise<GetTrackingLinksResponse> {
  const { claim_id } = input;
  const query = new URLSearchParams({ claim_id });
  const response = await fetch(`https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/claims/tracking-links?${query}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${YANGO_DELIVERY_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<YangoError>;
    throw new Error(`Yango Delivery ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetTrackingLinksResponse;
}

/*
Usage example:

const { route_points } = await getTrackingLinks({ claim_id: claimId });
const link = route_points.find((point) => point.type === "destination")?.sharing_link;
if (link) console.log("Send this to the customer:", link);
*/
