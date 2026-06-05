/**
 * @provider Bictorys
 * @capability create_subscription
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CreateSubscriptionInput {
  subscriptionPlanId: string;
  startDate: string;
  customerId: string;
  reference?: string;
  notificationChannel?: "email" | "sms" | "whatsApp" | "none";
}

interface SubscriptionResponse {
  id: string;
  nextInstallmentDueDate?: string;
  nbrPaidInstallments?: number;
  nbrUnpaidInstallments?: number;
  currentInstallmentStatus?: string;
  createdAt: string;
  updatedAt: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createSubscription(
  input: CreateSubscriptionInput
): Promise<SubscriptionResponse> {
  const response = await fetch(
    "https://api.bictorys.com/billing/v1/subscriptions",
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

  return response.json() as Promise<SubscriptionResponse>;
}

/*
Usage example — enrol a customer in a monthly plan:

// Step 1: Create the plan once (create_subscription_plan)
// const plan = await createSubscriptionPlan({ amount: 10000, currency: "XOF", ... });

// Step 2: Enrol the customer
const subscription = await createSubscription({
  subscriptionPlanId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // from create_subscription_plan
  startDate: "2026-07-01",
  customerId: "fbd2053b-638d-4133-957e-3caf63e6b79c",
  notificationChannel: "sms", // Bictorys sends SMS reminders before each charge
  reference: "TENANT-42-LOYER",
});

console.log("Subscription active:", subscription.id);
console.log("Next charge:", subscription.nextInstallmentDueDate);
// Bictorys handles all subsequent charges automatically — no manual action needed.
*/
