/**
 * @provider Bictorys
 * @capability create_order
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  reference?: string;
  taxRate?: number;
  discount?: number;
}

interface CreateOrderInput {
  reference: string;
  currency: string;
  orderDetails: OrderItem[];
  customerId?: string;
  amount?: number;
  deliveryCharges?: number;
  deductedAmount?: number;
  deviceId?: string;
}

interface CreateOrderResponse {
  id: string;
  reference?: string;
  subTotalAmount?: number;
  totalTax?: number;
  finalAmount?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createOrder(
  input: CreateOrderInput
): Promise<CreateOrderResponse> {
  const response = await fetch(
    "https://api.bictorys.com/order-management/v1/orders",
    {
      method: "POST",
      headers: {
        "X-API-Key": BICTORYS_SECRET_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<CreateOrderResponse>;
}

/*
Usage example — electronics order with delivery and a loyalty discount:

const order = await createOrder({
  reference: "ORDER-2026-0042",
  currency: "XOF",
  orderDetails: [
    {
      name: "Smartphone Tecno Spark 20",
      price: 150000,
      quantity: 1,
      reference: "SKU-TECNO-SPARK20",
      taxRate: 18,    // 18% VAT
    },
    {
      name: "Protective Case",
      price: 5000,
      quantity: 2,
    },
  ],
  deliveryCharges: 3000,
  deductedAmount: 10000,  // 10 000 XOF loyalty voucher
  customerId: "fbd2053b-638d-4133-957e-3caf63e6b79c",
});

console.log("Order ID:", order.id);
console.log("Total due:", order.finalAmount, order.currency);
// finalAmount = (150000 + 10000) × 1.18 + 3000 − 10000
// create_order does NOT charge the customer — call create_charge or create_invoice next
*/
