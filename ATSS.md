# specs/ — CLAUDE.md (ATSS Specification v1.1)

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

**category** — `payment`, `communications`, `identity`, `logistics` or `language` (extensible to other categories).
`communications` covers providers that send SMS, WhatsApp, USSD, voice or email —
the specific channels go in `provider.json`'s `channels` field, not in the category name.
**provider_slug** — lowercase, no spaces, no dashes (e.g. `paycard`, `wave`, `nimbasms`). Unique across all categories: the registry, the MCP and the website look providers up by slug alone, so a provider offering products in several categories uses one slug per product. `validate.js` rejects a slug reused in another category.
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
| category | string | `"payment"`, `"communications"`, `"identity"`, `"logistics"` or `"language"` — each category has a matching `plugin/skills/{category}/SKILL.md` |
| channels | string[] | Required when `category` is `"communications"`, optional otherwise. Non-empty array, values among `sms`, `whatsapp`, `ussd`, `voice`, `email`. Lists the channels the provider's public docs document — not only the ones that already have a spec |
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
| spec_version | string | `"1.0"`, or `"1.1"` when the spec uses a block added in 1.1 (see § Blocks added in ATSS 1.1) |
| provider_api_version | string | YYYY-MM-DD if provider has no version string |
| capability | string | snake_case — matches the directory name |
| capability_type | enum | `synchronous`, `asynchronous`, `webhook`, or `sdk` |
| status | enum | `unverified`, `draft`, `ready`, `verified`, `deprecated`, `archived` |
| currency | string[] | ISO 4217 codes. Required when the provider's `category` is `"payment"` (and must match its `country_code` — see `COUNTRY_CURRENCY_MAP` in `scripts/validate.js`; a pre-redenomination code the provider still uses, such as `SLL`, is accepted via `LEGACY_CURRENCY_CODES`); optional otherwise — omit it for identity, communications, etc. |
| sandbox | boolean | true if provider has a sandbox environment |
| docs_url | string | Can be `""` — provider has no public docs URL |
| docs_public | boolean | false if provider does not publish API docs publicly |
| auth | object | Auth descriptor — see auth variants below |
| endpoint | object | `{ method, url }` |
| example_prompt | string | Required for `ready`/`verified` — describes this specific capability usage for AI agents |
| input_schema | object | JSON Schema describing the request body. Path, query and header parameters go in `parameters` (1.1) |
| response_schema | object | JSON Schema describing the success response |
| error_schema | object | JSON Schema describing the error response |
| gotchas | string[] | MANDATORY — minimum 1 entry, no exceptions |

**Fields NOT in schema.json** (migrated to provider.json): `provider_slug`, `provider_name`, `category`, `country_code`.

### `evidence` — required only when `status` is `"unverified"`

```jsonc
"evidence": {
  "source_url": "https://provider.com/docs/create-payment",
  "source_reference": "Section 'Create a payment'",
  "extracted_at": "2026-09-15T10:00:00Z",
  "snapshot_hash": "a1b2c3…",
  "spans": ["POST /v1/payments", "Authorization: Bearer {api_key}"]
}
```

Every entry in `spans[]` must appear literally (whitespace/case-normalized) in the source document at `source_url`. This is what lets a reviewer verify an `unverified` spec wasn't hallucinated without re-reading the provider's docs from scratch.

### Blocks added in ATSS 1.1

Optional, checked against [`atss.schema.json`](./atss.schema.json) by `npm run validate`. A spec that
uses one sets `spec_version: "1.1"`; a 1.0 spec stays valid as is.

```jsonc
"verification": {                        // required when status is "verified", forbidden otherwise
  "method": "test_live",                 // test_live | app | community_report
  "environment": "sandbox",              // sandbox | production
  "at": "2026-10-24",                    // date of the test
  "ref": "https://…",                    // the run, the app, or the report issue — required for community_report
  "spec_hash": "sha256:…"                // what was tested: schema.json without this block + canonical_example.ts
},
"open_questions": [                      // what the provider's docs do not answer — never filled with a guess
  "Does the payment URL embed the public or the secret key?"
]
```

| Field | Rule |
|---|---|
| `verification.method` | `test_live` — `npm run test:live` passed; `app` — a working integration (`afrotools/examples` or an app in use); `community_report` — an integration report a maintainer accepted |
| `verification.environment` | Where it was tested. `sandbox` proves the request and response shapes, not production behaviour (prerequisites, limits, real money) |
| `verification.ref` | URL of the run, the app's code or the report. For `community_report`, the `afrotools/afrotools` issue |
| `verification.spec_hash` | `validate` recomputes it: a verified spec edited afterwards fails until it is verified again, or a maintainer who checked the change updates the hash (the error message prints the new value) |
| `open_questions` | Non-empty strings. An agent must tell the user about them before relying on the spec |

**Auth that is more than one key** — added to `auth`, next to the 1.0 fields (which stay):

```jsonc
"auth": {
  "type": "bearer", "location": "header", "field": "Authorization", "format": "Bearer {access_token}", "env_var": "DJOMY_CLIENT_ID",
  "credentials": [                       // every secret the user must provide
    { "env_var": "DJOMY_CLIENT_ID", "description": "clientId (API key), provided in the Djomy merchant space" },
    { "env_var": "DJOMY_CLIENT_SECRET", "description": "clientSecret (secret key), provided in the Djomy merchant space" }
  ],
  "signing": {                           // produces {signature}
    "algorithm": "HMAC-SHA256", "key": "{DJOMY_CLIENT_SECRET}", "message": "{DJOMY_CLIENT_ID}", "encoding": "hex"
  },
  "token_exchange": {                    // produces {access_token}
    "method": "POST", "path": "/v1/auth",
    "headers": [{ "in": "header", "name": "X-API-KEY", "value": "{DJOMY_CLIENT_ID}:{signature}" }],
    "token_field": "data.accessToken",   // dotted path in the response body
    "expires_in_s": 3600
  },
  "apply": [                             // what every request of this capability sends
    { "in": "header", "name": "X-API-KEY", "value": "{DJOMY_CLIENT_ID}:{signature}" },
    { "in": "header", "name": "Authorization", "value": "Bearer {access_token}" }
  ]
}
```

**Webhook signature** — only on a `capability_type: "webhook"` spec:

```jsonc
"webhook": {
  "signature": {
    "header": "X-Webhook-Signature",
    "format": "v1:{signature}",          // how the header carries it
    "algorithm": "HMAC-SHA256", "key": "{DJOMY_CLIENT_SECRET}", "message": "{raw_body}", "encoding": "hex"
  }
}
```

**Parameters outside the body** — `input_schema` is the request body; what travels in the URL path,
the query string or a header goes in `parameters`:

```jsonc
"endpoint": { "method": "POST", "url": "https://api.example.com/v1/payouts/{batch_id}/items" },
"parameters": [                          // illustrative provider
  { "name": "batch_id", "in": "path", "required": true, "schema": { "type": "string" }, "description": "Payout batch id" },
  { "name": "dry_run", "in": "query", "schema": { "type": "boolean" } },
  { "name": "Idempotency-Key", "in": "header", "required": true, "schema": { "type": "string" } }
]
```

**Success condition** — when a 2xx response is not enough (e.g. HTTP 200 with `{"code": 1}` on a failed
payment), the response field that says the call succeeded:

```jsonc
"success_condition": { "field": "code", "equals": 0 }              // or "in": ["SUCCESS", "PENDING"]
```

**Environments** — in `provider.json`, the base URL of each environment the provider documents:

```jsonc
"environments": { "sandbox": { "base_url": "https://sandbox-api.djomy.africa" } }
```

| Rule | |
|---|---|
| Placeholders | `{ENV_VAR}` is a declared credential; `{signature}` needs `auth.signing` (or is the `webhook.signature` result); `{access_token}` needs `auth.token_exchange`; `{raw_body}` is the request body exactly as received and `{header:Name}` the raw value of a request header — both in `webhook.signature.message` only, where an `{ENV_VAR}` may also be an identifier of yours that `canonical_example.ts` reads (e.g. `{header:Response-Timestamp}{SMILEID_PARTNER_ID}sid_request`); elsewhere `{ENV_VAR}` is a declared credential. `validate` rejects a placeholder that resolves to nothing |
| `auth.credentials` | Each env var once; not on `auth.type: "none"`; includes the 1.0 `auth.env_var`. Once present, every `process.env` read of `canonical_example.ts` must be declared there (or be the `webhook.signature.key` secret, or an env var signed in `webhook.signature.message`): an undeclared one fails, instead of the 1.0 warning |
| `auth.apply` | `in`: `header`, `query`, `body`, or `path` — a key that travels in the URL path, where `name` is the `{placeholder}` of `endpoint.url` it fills (e.g. Paycard's `/epay/{c}/{ref}/status`) |
| `auth.token_exchange` | `path` (on the environment's base URL) or `url` (a token server on another host, e.g. `https://idp.flutterwave.com/…/token`) — exactly one. `body` (name/value pairs) with its `content_type` (`application/x-www-form-urlencoded`) for a form-encoded token request; `headers` are headers only (`in: "header"`) |
| `webhook.signature.key` | Exactly one `{ENV_VAR}` — the secret, never a literal. It declares that env var for the spec |
| `algorithm`, `encoding` | `HMAC-SHA256`; `hex` or `base64` — the only values specs use so far; others are added with the first spec that needs them |
| `parameters` | `in`: `path`, `query` or `header`; `name` once per `in` (header names ignore case), never one `auth.apply` already sends; `schema` is a JSON Schema. A `path` parameter is `required: true` and fills a `{placeholder}` of `endpoint.url`; once `parameters` is present, every `{placeholder}` of the URL is filled by a path parameter or by `auth.apply` (`{UPPER_SNAKE_CASE}` stays an env var); a parameter is never also an `input_schema` property, and a `GET`/`DELETE` with `parameters` has no body. `validate` warns on a 1.1 spec whose URL has placeholders and no `parameters`. Not on a webhook: its URL is yours |
| `success_condition` | `field` is a dotted path (`data.status`, through array items) that `response_schema` describes, when it describes anything; exactly one of `equals` (a string, number, boolean or null) or `in` (a list of them), of the field's type (`0`, not `"0"`, for an integer `code`). Only what the provider's docs state — otherwise an open question. Not on a webhook |
| Idempotency | Convention, warned by `validate`: a `POST` of a payment provider that moves money (payment, checkout, payout, transfer, charge, refund, cash-in/out, OTP confirmation — not a status check or a recipient setup) says whether a retry is safe — its idempotency header in `parameters` (or field in `input_schema`), the behaviour in `gotchas`, or an `open_questions` entry when the docs say nothing. A retried payout without it can pay twice |
| `environments` | `sandbox` and/or `production`, each with an `https://host[:port]` `base_url` (no path, query or fragment). The `endpoint.url` of every non-webhook spec of the provider must start with one of them. An environment the provider does not document is left out — never guessed — and its absence goes in the specs' `open_questions` (a convention, not checked) |

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
unverified → draft → ready → verified → deprecated → archived
```

### unverified — criteria

- [ ] `schema.json` passes `npm run validate` (structure + evidence block)
- [ ] `evidence` block present with `source_url`, `source_reference`, `extracted_at`, `snapshot_hash`, and at least one grounded `spans[]` entry
- [ ] Generated automatically by the discovery pipeline (`core/tools/discovery`) — contributors do not hand-write `unverified` specs
- [ ] Not yet human-reviewed for correctness beyond the automated gates — a maintainer reviewing the PR promotes it to `draft` (needs more work) or `ready` (looks correct) by editing `status` and removing or keeping `evidence` as documentation

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
- [ ] **One of:**
  - `npm run test:live -- --provider <slug>` passes (exit 0) — `method: "test_live"`; its `--report`
    gives each capability's `spec_hash`
  - A working integration: `afrotools/examples`, or an app in use — `method: "app"`
  - An integration report a maintainer accepted (see `CONTRIBUTING.md` § Report an integration) — `method: "community_report"`
- [ ] `verification` block records the method, the environment, the date and `spec_hash`
- [ ] Maintainer has set status to `verified`

`verified` says the spec matched the API once, in `verification.environment`. A spec verified in
`sandbox` has not been tried with production credentials. `test:live` only ever targets a sandbox —
it refuses to run against a provider with no sandbox (real production traffic, no automated safety
net); see `CONTRIBUTING.md` § Live verification.

### AI Ready

AI Ready is a promise of the whole registry, not a per-provider badge: every published provider
has ATSS specs an agent can integrate from without parsing documentation pages. It does not mean
a spec is error-free — a spec can be wrong until it is tested, which is what `status` tells the
agent. Never describe AI Ready as "verified", "tested" or "production-ready".

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

See the auto-generated table in [README.md](./README.md) — it is regenerated by CI
(`scripts/generate-readme.js`) on every merge to `main` and is never out of sync.
This file used to keep a second, hand-maintained copy of that table; it drifted
from reality within weeks and is not worth re-introducing here.
