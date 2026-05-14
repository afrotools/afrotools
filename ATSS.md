# specs/ — CLAUDE.md (ATSS Specification v1.0)

## What is ATSS

ATSS (Afro.tools Spec Specification) defines the structure, required fields, and rules
for every spec in this registry.

A spec is a structured, machine-readable description of one API capability.
It is not a wrapper. It is not an SDK. It is a declarative description.

> **Terminology note:** In this repo, "spec" refers to an ATSS API description
> (`schema.json` + `canonical_example.ts`).
> This is distinct from Claude Code "skills" (SKILL.md files in `plugin/skills/`),
> which are instruction files for AI agents.

---

## Folder structure

```
specs/{category}/{provider_slug}/
├── provider.json              ← provider-level metadata
└── {capability}/
    ├── schema.json            ← capability spec
    └── canonical_example.ts   ← working TypeScript example
```

**category** — `payment` or `sms` (extensible to other categories)
**provider_slug** — lowercase, no spaces, no dashes (e.g. `paycard`, `wave`, `nimbasms`)
**capability** — snake_case verb (e.g. `create_payment`, `verify_payment`, `send_otp`)

Every capability folder must contain exactly these two files. Nothing else.

---

## provider.json — required fields

One `provider.json` per provider directory. Carries provider-level metadata migrated from `schema.json`.

```json
{
  "slug": "paycard",
  "name": "Paycard",
  "category": "payment",
  "country_code": ["GN"],
  "description": "Paycard is a Guinean mobile money payment gateway that lets you accept payments via MTN, Orange, and Cellcom mobile wallets.",
  "example_prompt": "Integrate Paycard to accept mobile money payments in Guinea. Create a payment, extract the operation_reference, and verify the transaction server-side before fulfilling the order."
}
```

| Field | Type | Rule |
|---|---|---|
| slug | string | Lowercase, no spaces, no dashes — matches the directory name |
| name | string | Display name of the provider |
| category | string | `"payment"` or `"sms"` |
| country_code | string[] | ISO 3166-1 alpha-2 codes — non-empty array |
| description | string | One-sentence description of the provider for display and MCP context |
| example_prompt | string | Full-flow usage prompt for AI agents — describes a complete integration scenario |

---

## schema.json — required fields

```json
{
  "spec_version": "1.0",
  "provider_api_version": "2024-01-01",
  "capability": "create_payment",
  "capability_type": "synchronous",
  "status": "ready",
  "currency": ["GNF"],
  "sandbox": false,
  "docs_url": "https://paycard.com/docs/create-payment",
  "docs_public": false,
  "auth": {
    "type": "api_key",
    "location": "body",
    "field": "c",
    "format": "{token}",
    "env_var": "PAYCARD_API_KEY"
  },
  "endpoint": {
    "method": "POST",
    "url": "https://mapaycard.com/epay/create/"
  },
  "example_prompt": "Initiate a Paycard mobile money payment for a given amount in GNF, extract the operation_reference from the response, and store it immediately before redirecting the user.",
  "input_schema": {},
  "response_schema": {},
  "error_schema": {},
  "gotchas": [
    "Always verify payment status server-side before fulfilling an order."
  ]
}
```

### Field rules

| Field | Type | Rule |
|---|---|---|
| spec_version | string | Always "1.0" |
| provider_api_version | string | YYYY-MM-DD if provider has no version string |
| capability | string | snake_case — matches the directory name |
| capability_type | enum | `synchronous`, `asynchronous`, `webhook`, or `sdk` |
| status | enum | `draft`, `ready`, `verified`, `deprecated`, `archived` |
| currency | string[] | ISO 4217 codes |
| sandbox | boolean | true if provider has a sandbox environment |
| docs_url | string | Can be `""` — provider has no public docs URL |
| docs_public | boolean | false if provider does not publish API docs publicly |
| auth | object | Auth descriptor — see auth variants below |
| endpoint | object | `{ method, url }` |
| example_prompt | string | Required for `ready`/`verified` — describes this specific capability usage for AI agents |
| input_schema | object | JSON Schema describing the request body |
| response_schema | object | JSON Schema describing the success response |
| error_schema | object | JSON Schema describing the error response |
| gotchas | string[] | MANDATORY — minimum 1 entry, no exceptions |

**Fields NOT in schema.json** (migrated to provider.json): `provider_slug`, `provider_name`, `category`, `country_code`.

### capability_type definitions

- `synchronous` — request/response, result available immediately in the HTTP response
- `asynchronous` — provider processes in background, poll a separate endpoint for result
- `webhook` — provider sends an HTTP POST to your endpoint when an event occurs
- `sdk` — capability delivered through a client-side SDK script (no direct HTTP endpoint). `endpoint.url` holds the CDN URL of the SDK script; `endpoint.method` is `null`. The `canonical_example.ts` exports a server-side configuration helper; the actual SDK invocation is shown in the usage comment block. Auth credential goes in `auth.location: "sdk_param"` (the SDK's config object).

---

## canonical_example.ts — rules

### Mandatory rules

1. TypeScript strict — must compile with `tsc --noEmit`, zero errors
2. Native fetch only — no axios, no node-fetch, no external HTTP libraries
3. All credentials via `process.env` — checked at the top, throw if missing
4. Explicit TypeScript interfaces for input, response, and error types
5. Export the main function
6. Include a usage example in a comment block at the bottom
7. JSDoc header: provider, capability, ATSS version, capability_type

### Template

```typescript
/**
 * @provider Paycard
 * @capability create_payment
 * @atss 1.0
 * @capability_type synchronous
 */

const PAYCARD_API_KEY = process.env.PAYCARD_API_KEY;
if (!PAYCARD_API_KEY) throw new Error("Missing env: PAYCARD_API_KEY");

interface CreatePaymentInput {
  amount: number;
  currency: string;
  reference: string;
  callback_url: string;
}

interface CreatePaymentResponse {
  id: string;
  payment_url: string;
  status: string;
}

interface PaycardError {
  code: string;
  message: string;
}

export async function createPayment(
  input: CreatePaymentInput
): Promise<CreatePaymentResponse> {
  const response = await fetch("https://mapaycard.com/epay/create/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...input, c: PAYCARD_API_KEY }),
  });

  if (!response.ok) {
    const error: PaycardError = await response.json();
    throw new Error(`Paycard error ${response.status}: ${error.message}`);
  }

  return response.json() as Promise<CreatePaymentResponse>;
}

/*
Usage example:

const payment = await createPayment({
  amount: 100000,
  currency: "GNF",
  reference: "order_123",
  callback_url: "https://myapp.com/callback",
});

// Store payment.operation_reference immediately
// Always verify payment status server-side before fulfilling the order
*/
```

### What must never appear in canonical_example.ts

- Any npm import (`axios`, `node-fetch`, etc.) — native fetch only
- `require()` — ES modules only
- Hardcoded API keys or secrets
- `any` type without a comment explaining why

---

## Status lifecycle

```
draft → ready → verified → deprecated → archived
```

### ready — criteria

- [ ] `schema.json` passes `npm run validate`
- [ ] `canonical_example.ts` compiles with `tsc --noEmit`
- [ ] `gotchas[]` has at least 1 specific, actionable entry
- [ ] `example_prompt` is non-empty
- [ ] `provider.json` exists in the parent provider directory
- [ ] `status` field set to `ready`

A `ready` spec is visible in the MCP server.

### verified — criteria

- [ ] All `ready` criteria met
- [ ] Working example exists in `afrotools/examples`
- [ ] Maintainer has set status to `verified`

A `verified` spec contributes to the provider's "AI Ready" badge.

### AI Ready badge rule

A provider is AI Ready only when ALL its capabilities are `verified`.

---

## Gotchas — writing guide

**Good:**
```
"Always verify payment status server-side before fulfilling an order.
The callback URL alone is not sufficient — it can be forged."
```

**Bad:**
```
"Read the docs carefully."
```

Gotchas must be: specific, actionable, based on real integration experience.

---

## Provider index

| Provider | Category | Slug | Countries | Capabilities | Status |
|---|---|---|---|---|---|
| Paycard | payment | paycard | GN | create_payment, verify_payment, webhook_payment_completed | verified (3/3) |
| Djomy | payment | djomy | GN | confirm_otp, create_payment, create_payment_gateway, create_payment_link, get_payment_link, verify_payment, webhook_payment_completed | ready (4/7 verified) |
| LengoPay | payment | lengopay | GN | cashin_request, cashin_status, create_payment, get_balance, list_cashin_transactions, list_transactions, verify_payment, webhook_payment_completed | ready (2/8 verified) |
| Wave | payment | wave | SN, CI, ML, GN, UG, BF, GM, NE, CM, SL, CD | create_checkout_session, create_payout_batch, expire_checkout, get_balance, get_payout, get_transactions, refund_checkout, search_checkouts, send_payout, verify_payment, verify_recipient, webhook_payment_completed | ready (12/12) |
| NimbaSMS | sms | nimbasms | GN | create_contact, get_balance, get_message, list_contacts, list_groups, list_messages, list_sendernames, send_message, send_verification, verify_code, webhook_sms_status | ready (11/11) |
| Bictorys | payment | bictorys | — | — | planned |
| KadevPay | payment | kadevpay | CI | create_checkout_session, verify_payment, webhook_payment_success | draft (0/3) |
