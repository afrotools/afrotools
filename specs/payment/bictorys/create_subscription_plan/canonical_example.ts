/**
 * @provider Bictorys
 * @capability create_subscription_plan
 * @atss 1.0
 * @capability_type synchronous
 */

const BICTORYS_SECRET_KEY = process.env.BICTORYS_SECRET_KEY;
if (!BICTORYS_SECRET_KEY) throw new Error("Missing env: BICTORYS_SECRET_KEY");

interface CreateSubscriptionPlanInput {
  amount: number;
  currency: string;
  name?: string;
  reference?: string;
  nbrInstallments?: number;
  installmentIntervalDays?: number;
  customerMessage?: string;
}

interface SubscriptionPlanResponse {
  id: string;
  amount: number;
  currency: string;
  name?: string;
  reference?: string;
  nbrInstallments?: number;
  installmentIntervalDays?: number;
  customerMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface BictorysError {
  status: string;
  title: string;
  details: string;
}

export async function createSubscriptionPlan(
  input: CreateSubscriptionPlanInput
): Promise<SubscriptionPlanResponse> {
  const response = await fetch(
    "https://api.bictorys.com/billing/v1/subscription-plans",
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

  return response.json() as Promise<SubscriptionPlanResponse>;
}

/*
Usage example — monthly SaaS plan of 10 000 XOF:

const plan = await createSubscriptionPlan({
  amount: 10000,
  currency: "XOF",
  name: "Plan Standard",
  reference: "PLAN-STD-01",
  installmentIntervalDays: 30,   // monthly
  nbrInstallments: 12,           // 1 year; omit for indefinite
  customerMessage: "Votre abonnement mensuel a été renouvelé.",
});

console.log("Plan created:", plan.id);
// Pass plan.id to create_subscription to enrol a customer.
*/
