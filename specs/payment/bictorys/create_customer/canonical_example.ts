/**
 * @provider Bictorys
 * @capability create_customer
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CreateCustomerInput {
  country: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  locale?: string;
}

interface CustomerResponse {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  country: string;
  address?: string;
  city?: string;
  postalCode?: string;
  locale?: string;
  createdAt: string;
  updatedAt: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createCustomer(
  input: CreateCustomerInput,
  options: { createOrUpdate?: boolean } = {}
): Promise<CustomerResponse> {
  const url = "https://api.bictorys.com/customer-management/v1/customers"
    + (options.createOrUpdate ? "?createOrUpdate=true" : "");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-API-Key": BICTORYS_SECRET_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error: BictorysError = await response.json();
    throw new Error("Bictorys error " + response.status + ": " + (error.details ?? error.title));
  }

  return response.json() as Promise<CustomerResponse>;
}

/*
Usage example — create a Senegalese customer (upsert-safe):

const customer = await createCustomer(
  {
    country: "SN",
    name: "Ibrahima Diop",
    phone: "+221770001234",
    email: "ibrahima.diop@example.com",
    city: "Dakar",
    locale: "fr",
  },
  { createOrUpdate: true }  // safe to call multiple times — updates if already exists
);

console.log("Customer ID:", customer.id);
// Store customer.id in your DB — required for create_subscription, create_bnpl, create_payout
*/
