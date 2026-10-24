/**
 * @provider Yango Delivery
 * @capability create_delivery_claim
 * @atss 1.0
 * @capability_type synchronous
 */

const YANGO_DELIVERY_TOKEN = process.env.YANGO_DELIVERY_TOKEN;
if (!YANGO_DELIVERY_TOKEN) throw new Error("Missing env: YANGO_DELIVERY_TOKEN");

export type CreateDeliveryClaimInput = {
  request_id: string;
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
    point_id: number;
    type: "source" | "destination" | "return";
    visit_order: number;
    buyout?: {
      payment_method: "card" | "cash";
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
      payment_method: "card" | "cash";
      customer?: {
        email?: string;
        inn?: string;
        phone?: string;
      };
    };
    pickup_code?: string;
    skip_confirmation?: boolean;
  }[];
  auto_accept?: boolean;
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
  due?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    phone_additional_code?: string;
  };
  offer_payload?: string;
  optional_return?: boolean;
  referral_source?: string;
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
};

export type CreateDeliveryClaimResponse = {
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
  code: "validation_error" | "sdd_items_without_parameters_forbidden" | "items_without_parameters_forbidden" | "sdd_multipoints_not_supported" | "address_too_far" | "address_not_found" | "bad_request" | "invalid_post_payment" | "sdd_client_requirements_forbidden" | "invalid_delivery_interval" | "wrong_pickup_code_format" | "wrong_pickup_code_usage" | "unknown_zone" | "invalid_time_intervals" | "unsupported_points_count" | "invalid_phone_incorrect_symbol" | "invalid_phone_must_start_plus_symbol" | "country_phone_code_not_supported" | "invalid_phone_size_incorrect" | "item_destination_point_not_found" | "invalid_destination_point" | "due_in_past" | "delay_too_long" | "external_order_id_not_allowed" | "address_outside_delivery_zone" | "invalid_buyout_point_type" | "payment_on_delivery_missed" | "payment_on_delivery_invalid_request" | "max_order_cost_exceeded" | "invalid_post_payment_payment_method" | "invalid_buyout_payment_method" | "invalid_source_point" | "invalid_point_phone" | "invalid_item_destination_point" | "invalid_item_source_point" | "different_cost_currencies" | "buyout_disabled" | "payment_on_delivery_disabled" | "forbidden_by_antifake" | "too_many_requests";
  message: string;
};

export async function createDeliveryClaim(input: CreateDeliveryClaimInput): Promise<CreateDeliveryClaimResponse> {
  const { request_id, ...body } = input;
  const query = new URLSearchParams({ request_id });
  const response = await fetch(`https://b2b.delivery.yango.tech/b2b/cargo/integration/v2/claims/create?${query}`, {
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

  return (await response.json()) as CreateDeliveryClaimResponse;
}

/*
Usage example:

async function orderCourier(itemPrice: string, itemCurrency: string) {
  const requestId = crypto.randomUUID(); // store it: reuse it only to retry after a 5xx or a timeout
  const claim = await createDeliveryClaim({
    request_id: requestId,
    items: [
      {
        pickup_point: 1,
        droppof_point: 2,
        title: "Order #1042",
        cost_value: itemPrice,
        cost_currency: itemCurrency, // confirm the currency with your Yango Delivery manager
        quantity: 1,
        size: { length: 0.3, width: 0.2, height: 0.1 },
        weight: 1.2,
      },
    ],
    route_points: [
      {
        point_id: 1,
        visit_order: 1,
        type: "source",
        contact: { name: "MyShop", phone: "+2250700000001", email: "orders@example.com" },
        address: { fullname: "Plateau, Abidjan", coordinates: [-4.0167, 5.3236] }, // [longitude, latitude]
      },
      {
        point_id: 2,
        visit_order: 2,
        type: "destination",
        contact: { name: "Awa Kone", phone: "+2250700000000" },
        address: { fullname: "Cocody, Abidjan", coordinates: [-3.9881, 5.3544] },
        external_order_id: "1042",
      },
    ],
    client_requirements: { taxi_class: "courier" },
  });
  // Status is "new": poll getDeliveryClaim until "ready_for_approval", then acceptDeliveryClaim with its version.
  return claim.id;
}
*/
