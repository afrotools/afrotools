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
specs/{category}/{provider_slug}/{capability}/
    schema.json
    canonical_example.ts
```

**category** — `payment` or `sms` (extensible to other categories)
**provider_slug** — lowercase, no spaces, no dashes (e.g. `paycard`, `wave`, `nimbasms`)
**capability** — snake_case verb (e.g. `create_payment`, `verify_payment`, `send_otp`)

Every spec folder must contain exactly these two files. Nothing else.

---

## schema.json — required fields

```json
{
  "spec_version": "1.0",
  "provider_slug": "paycard",
  "provider_name": "Paycard",
  "provider_api_version": "2024-01-01",
  "category": "payment",
  "capability": "create_payment",
  "capability_type": "synchronous",
  "status": "compliant",
  "country_code": ["GN"],
  "currency": ["GNF"],
  "sandbox": false,
  "docs_url": "https://paycard.com/docs/create-payment",
  "auth": {
    "type": "api_key",
    "header": "X-Api-Key",
    "format": "{token}",
    "env_var": "PAYCARD_API_KEY"
  },
  "endpoint": {
    "method": "POST",
    "url": "https://api.paycard.com/v1/payments"
  },
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
| provider_slug | string | Lowercase, no dashes, no spaces |
| provider_api_version | string | YYYY-MM-DD if provider has no version string |
| capability_type | enum | `synchronous`, `asynchronous`, or `webhook` |
| status | enum | `draft`, `compliant`, `verified`, `deprecated`, `archived` |
| country_code | string[] | ISO 3166-1 alpha-2 codes |
| currency | string[] | ISO 4217 codes |
| sandbox | boolean | true if provider has a sandbox environment |
| gotchas | string[] | MANDATORY — minimum 1 entry, no exceptions |
| input_schema | object | JSON Schema describing the request body |
| response_schema | object | JSON Schema describing the success response |
| error_schema | object | JSON Schema describing the error response |

### capability_type definitions

- `synchronous` — request/response, result available immediately in the HTTP response
- `asynchronous` — provider processes in background, poll a separate endpoint for result
- `webhook` — provider sends an HTTP POST to your endpoint when an event occurs

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
  const response = await fetch("https://api.paycard.com/v1/payments", {
    method: "POST",
    headers: {
      "X-Api-Key": PAYCARD_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
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

// Redirect user to payment.payment_url
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
draft → compliant → verified → deprecated → archived
```

### compliant — criteria

- [ ] `schema.json` passes `npm run validate`
- [ ] `canonical_example.ts` compiles with `tsc --noEmit`
- [ ] `gotchas[]` has at least 1 specific, actionable entry
- [ ] `status` field set to `compliant`

A `compliant` spec is visible in the MCP server.

### verified — criteria

- [ ] All compliant criteria met
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

| Provider | Category | Slug | Country | Capabilities | Status |
|---|---|---|---|---|---|
| Paycard | payment | paycard | GN | create_payment, verify_payment, webhook | In progress |
| Wave | payment | wave | SN, CI, ML | create_payment, verify_payment, webhook | Planned |
| LengoPay | payment | lengopay | — | create_payment, verify_payment | Planned |
| Djomy | payment | djomy | — | create_payment, verify_payment | Planned |
| Bictorys | payment | bictorys | — | create_payment, verify_payment, webhook | Planned |
| NimbaSMS | sms | nimbasms | SN | send_otp, send_bulk | Planned |