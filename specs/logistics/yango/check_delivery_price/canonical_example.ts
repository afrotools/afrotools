/**
 * @provider Yango Delivery
 * @capability check_delivery_price
 * @atss 1.0
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type CheckDeliveryPriceInput = {
  route_points: {
    coordinates?: [number, number];
    fullname?: string;
    id?: number;
  }[];
  items?: {
    quantity: number;
    dropoff_point?: number;
    pickup_point?: number;
    size?: {
      height: number;
      length: number;
      width: number;
    };
    weight?: number;
  }[];
  requirements?: {
    taxi_class: string;
    cargo_loaders?: number;
    cargo_options?: string[];
    cargo_type?: "van" | "lcv_m" | "lcv_l" | "lcv_xl";
    pro_courier?: boolean;
  };
  skip_door_to_door?: boolean;
};

export type CheckDeliveryPriceResponse = {
  price: string;
  requirements: {
    taxi_class: string;
    cargo_loaders?: number;
    cargo_options?: string[];
    cargo_type?: "van" | "lcv_m" | "lcv_l" | "lcv_xl";
    pro_courier?: boolean;
  };
  currency_rules?: {
    code: string;
    template: string;
    text: string;
    sign?: string;
  };
  distance_meters?: number;
  eta?: number;
  zone_id?: string;
};

type YangoError = {
  code: "bad_request" | "address_not_found" | "errors.suitable_offer_not_found" | "estimating.cant_construct_route" | "estimating.cargocorp_payment_failure" | "estimating.claim.no_zone_id" | "estimating.limited_by_claims_creation_overflow" | "estimating.no_pickup_point" | "estimating.payment_method_cant_order" | "estimating.payment_method_zone_unavailable" | "estimating.permitted_tariffs_not_enough" | "estimating.requirement_unavailable" | "estimating.route_too_long" | "estimating.tariff.no_categories" | "estimating.tariff.no_categories_in_zone" | "estimating.tariff.no_sdd_tariff" | "estimating.tariff.no_tariff_plan" | "estimating.too_large_linear_size" | "estimating.too_many_loaders" | "estimating.warning.too_heavy_item" | "estimating.warning.too_large_item" | "too_many_requests";
  message: string;
};

export async function checkDeliveryPrice(input: CheckDeliveryPriceInput): Promise<CheckDeliveryPriceResponse> {
  const response = await fetch("https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/check-price", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YANGO_DELIVERY_TOKEN}`,
      "Accept-Language": "en",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<YangoError>;
    throw new Error(`Yango Delivery ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as CheckDeliveryPriceResponse;
}

/*
Usage example:

const estimate = await checkDeliveryPrice({
  route_points: [
    { coordinates: [-4.0167, 5.3236], fullname: "Plateau, Abidjan" }, // [longitude, latitude]
    { coordinates: [-3.9881, 5.3544], fullname: "Cocody, Abidjan" },
  ],
  requirements: { taxi_class: "courier" },
});
console.log(estimate.price, estimate.currency_rules?.code);
*/
