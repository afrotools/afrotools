/**
 * @provider Yango Delivery
 * @capability get_delivery_claim
 * @atss 1.0
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type GetDeliveryClaimInput = {
  claim_id: string;
};

export type GetDeliveryClaimResponse = {
  created_ts: string;
  id: string;
  items: {
    cost_currency: string;
    cost_value: string;
    droppof_point: number;
    pickup_point: number;
    quantity: number;
    title: string;
    extra_id?: string;
    fiscalization?: {
      article?: string;
      excise?: string;
      item_type?: "product" | "service";
      mark?: {
        code: string;
        kind: string;
      };
      supplier_inn?: string;
      vat_code_str?: string;
    };
    size?: {
      height: number;
      length: number;
      width: number;
    };
    weight?: number;
  }[];
  revision: number;
  route_points: {
    address: {
      fullname: string;
      building?: string;
      building_name?: string;
      city?: string;
      comment?: string;
      coordinates?: [number, number];
      country?: string;
      description?: string;
      door_code?: string;
      door_code_extra?: string;
      doorbell_name?: string;
      porch?: string;
      sflat?: string;
      sfloor?: string;
      shortname?: string;
      street?: string;
      uri?: string;
    };
    contact: {
      name: string;
      phone: string;
      email?: string;
      phone_additional_code?: string;
    };
    id: number;
    type: "source" | "destination" | "return";
    visit_order: number;
    visit_status: "pending" | "arrived" | "visited" | "skipped";
    visited_at: {
      actual?: string;
      expected?: string;
      expected_waiting_time_sec?: number;
    };
    expected_visit_interval?: {
      from: string;
      to: string;
    };
    external_order_cost?: {
      currency: string;
      currency_sign: string;
      value: string;
    };
    external_order_id?: string;
    leave_under_door?: boolean;
    meet_outside?: boolean;
    no_door_call?: boolean;
    payment_on_delivery?: {
      is_paid: boolean;
      client_order_id?: string;
      customer?: {
        email?: string;
        full_name?: string;
        inn?: string;
        phone?: string;
      };
      invoice_link?: string;
      payment_method?: "card" | "cash";
      payment_ref_id?: string;
    };
    pickup_code?: string;
    return_comment?: string;
    return_reasons?: string[];
    skip_confirmation?: boolean;
  }[];
  status: "new" | "estimating" | "estimating_failed" | "ready_for_approval" | "accepted" | "performer_lookup" | "performer_draft" | "performer_found" | "performer_not_found" | "pickup_arrived" | "ready_for_pickup_confirmation" | "pickuped" | "delivery_arrived" | "ready_for_delivery_confirmation" | "delivered" | "delivered_finish" | "returning" | "return_arrived" | "ready_for_return_confirmation" | "returned" | "returned_finish" | "failed" | "cancelled" | "cancelled_with_payment" | "cancelled_by_taxi" | "cancelled_with_items_on_hands";
  updated_ts: string;
  user_request_revision: string;
  version: number;
  callback_properties?: {
    callback_url: string;
  };
  client_requirements?: {
    taxi_class: string;
    cargo_loaders?: number;
    cargo_options?: string[];
    cargo_type?: "van" | "lcv_m" | "lcv_l" | "lcv_xl";
    pro_courier?: boolean;
  };
  comment?: string;
  corp_client_id?: string;
  current_point_id?: number;
  due?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    phone_additional_code?: string;
  };
  error_messages?: {
    code: string;
    message: string;
  }[];
  eta?: number;
  matched_cars?: {
    taxi_class: string;
    cargo_loaders?: number;
    cargo_type?: string;
    cargo_type_int?: number;
    client_taxi_class?: string;
    door_to_door?: boolean;
    pro_courier?: boolean;
  }[];
  optional_return?: boolean;
  performer_info?: {
    courier_name: string;
    legal_name: string;
    car_color?: string;
    car_color_hex?: string;
    car_model?: string;
    car_number?: string;
    transport_type?: string;
  };
  pricing?: {
    currency?: string;
    currency_rules?: {
      code: string;
      template: string;
      text: string;
      sign?: string;
    };
    final_price?: string;
    final_pricing_calc_id?: string;
    offer?: {
      offer_id: string;
      price: string;
      price_with_vat?: string;
      valid_until?: string;
    };
  };
  route_id?: string;
  same_day_data?: {
    delivery_interval: {
      from: string;
      to: string;
    };
  };
  shipping_document?: string;
  skip_act?: boolean;
  skip_client_notify?: boolean;
  skip_door_to_door?: boolean;
  skip_emergency_notify?: boolean;
  warnings?: {
    code: string;
    source: string;
    message?: string;
  }[];
};

type YangoError = {
  code: "bad_request" | "not_found" | "too_many_requests";
  message: string;
};

export async function getDeliveryClaim(input: GetDeliveryClaimInput): Promise<GetDeliveryClaimResponse> {
  const { claim_id } = input;
  const query = new URLSearchParams({ claim_id });
  const response = await fetch(`https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/claims/info?${query}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${YANGO_DELIVERY_TOKEN}`,
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as Partial<YangoError>;
    throw new Error(`Yango Delivery ${response.status} ${error.code ?? ""}: ${error.message ?? response.statusText}`);
  }

  return (await response.json()) as GetDeliveryClaimResponse;
}

/*
Usage example:

async function waitForApproval(claimId: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const claim = await getDeliveryClaim({ claim_id: claimId });
    if (claim.status === "ready_for_approval") {
      // The items may not fit the vehicle: decide before confirming (within 10 minutes, with claim.version).
      if (claim.warnings?.some((w) => w.code === "not_fit_in_car")) console.warn("Items may not fit the vehicle");
      return claim;
    }
    if (claim.status === "estimating_failed") throw new Error(claim.error_messages?.map((e) => e.message).join("; "));
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error("Claim still not estimated");
}
*/
