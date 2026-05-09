---
name: new
description: >
  Use when adding a new API provider to the Afro.tools registry. Point it at the provider's
  documentation URL (or a local file) and it will: discover all API endpoints, create
  provider.json, generate schema.json + canonical_example.ts for every capability, run
  validation, and optionally verify response schemas against the live API.
  Invoke with: /afrotools:new <docs_url> [category] [provider_slug]. Manual invocation only.
disable-model-invocation: true
---

# /afrotools:new

Reads provider API documentation and scaffolds a complete, validated set of ATSS specs
for every capability it finds. Acts as a meticulous contractor: read everything first,
plan the full scope, implement each piece, verify each piece, then do a final sweep
before declaring done.

## Usage

```
/afrotools:new <docs_url_or_path> [category] [provider_slug]
```

`category` and `provider_slug` are optional — infer them from the docs when not provided.

Examples:
```
/afrotools:new https://docs.wave.com/business payment wave
/afrotools:new https://developer.orange.com/apis/om-webpay-senegal payment orangemoney-senegal
/afrotools:new ./local-api-docs.html sms nimbasms
```

---

## Workflow

### Step 0 — Create a git branch

Before writing any file, create a branch:

```bash
git pull origin main

# New provider (all capabilities in one PR):
git checkout -b spec/{provider_slug}

# Adding capabilities to an existing provider:
git checkout -b spec/{provider_slug}-{short-description}
# e.g. spec/wave-payouts, spec/nimbasms-contacts
```

Never write spec files directly on `main`.

---

### Phase 1 — Read docs and understand the provider

**Step 1. Ingest the documentation.**

If the argument is a URL:
```
WebFetch(url)
```
If it is a local file path:
```
Read(path)
```
If the docs reference sub-pages (authentication guide, webhook reference, error codes,
pagination), fetch those too before proceeding. Never assume the landing page contains
everything — capabilities are often spread across multiple pages.

**If the fetch fails** (401, 403, timeout, or docs behind a login):
1. Try appending `/docs`, `/api`, or `/reference` to the base URL.
2. Ask the user if they have a Postman collection or OpenAPI file they can share as a local path.
3. Ask them to paste the relevant documentation sections directly in the conversation.
4. As a last resort, work from code examples visible on the provider's website or dashboard.
Never invent fields — only document what you can verify.

**Step 2. Extract provider metadata.**

From the docs, identify:
- Provider display name (e.g. "Wave", "NimbaSMS")
- Provider slug — lowercase, no spaces. Single-word providers: `wave`, `nimbasms`.
  Compound names or geographic variants may use hyphens: `orangemoney-mali`, `orangemoney-senegal`.
- Category — `payment` or `sms` (extend only if genuinely needed)
- Countries where the provider operates (ISO 3166-1 alpha-2 codes)
- Currencies accepted (ISO 4217 codes) — must be coherent with country list
- Whether a sandbox/test environment exists (boolean)
- Whether the API docs are publicly accessible (`docs_public` boolean)
- Provider website URL and docs URL

If any field cannot be determined from the docs, mark it explicitly as unknown — never guess.

**Step 3. Build a capability inventory table.**

Read the entire documentation systematically. For every HTTP endpoint and webhook event,
add a row:

| # | Capability (snake_case) | HTTP Method | Endpoint URL | Type |
|---|---|---|---|---|
| 1 | create_payment | POST | /v1/payments | synchronous |
| 2 | verify_payment | GET | /v1/payments/{id} | synchronous |
| 3 | webhook_payment_completed | — | {your_webhook_url} | webhook |

Capability naming conventions:
- `create_{resource}`, `verify_{resource}`, `get_{resource}`, `list_{resources}`
- Actions: `expire_checkout`, `refund_payment`, `confirm_otp`
- Webhooks: `webhook_{event_name}` (e.g. `webhook_payment_completed`, `webhook_sms_status`)

`capability_type` rules:
- `synchronous` — result available immediately in the HTTP response
- `asynchronous` — provider queues the work; you must poll a separate endpoint for the result
- `webhook` — provider sends an HTTP POST to your URL when an event occurs

**Which endpoints to include:**
Include every endpoint a developer needs to build a complete integration. Skip:
- Admin/backoffice-only endpoints (not usable in customer-facing flows)
- Pure infrastructure endpoints (health checks, `/ping`, uptime probes)
- Explicitly deprecated endpoints — note them in the table with "deprecated" and skip implementing

When in doubt, include it. A spec is cheap; a missing one causes real integration failures.

---

### CHECKPOINT 1 — Discovery verification (mandatory before writing any file)

Re-read the docs with the capability table in hand. Section by section, confirm:
- Is every endpoint already in the table?
- Are there webhook events documented on a separate page?
- Are there async poll endpoints that pair with a queued action endpoint?
- Are there utility endpoints (balance inquiry, recipient verification, transaction search)?

Do not start Phase 2 until you are confident the table is exhaustive. If something is ambiguous,
resolve it explicitly before moving on.

**Explicit rule: scaffold every capability in the table. Never autonomously pick a subset
(e.g. "the two most common ones"). If the table has 31 rows, you create 31 spec folders.**
If the number of capabilities is unexpectedly large, tell the user the full count and proceed —
do not silently reduce scope.

---

### Phase 2 — Create `provider.json`

**Step 4. Create `specs/{category}/{provider_slug}/provider.json`.**

If the provider directory already exists (you are adding capabilities to a provider that
already has specs), check if `provider.json` is complete — if so, skip to Phase 3.
Otherwise read it before editing — do not overwrite fields that are already correct.

Required structure:
```json
{
  "slug": "wave",
  "name": "Wave",
  "category": "payment",
  "country_code": ["SN", "CI", "ML", "GN", "UG", "BF", "GM", "NE", "CM", "SL", "CD"],
  "website": "https://www.wave.com",
  "docs_url": "https://docs.wave.com/business",
  "docs_public": true,
  "sandbox": false,
  "description": "Wave is a mobile money provider operating across West and Central Africa.",
  "example_prompt": "Accept Wave mobile money payments in my Senegalese e-commerce checkout."
}
```

**Currency coherence:** Before setting `country_code`, read `scripts/validate.js` lines 50–65
to get the `COUNTRY_CURRENCY_MAP`. The validator requires that for every country in
`country_code[]`, the country's standard currency appears in each spec's `currency[]` array.
If the provider uses a non-standard currency for a country (e.g. processing XAF for users
in Nigeria), either exclude that country from `country_code` or add the currency to the map.
Failing to check this upfront causes cross-spec validation failures after all specs are created.

Field rules:
- `slug` — exactly matches the directory name
- `country_code` — non-empty array; use ISO 3166-1 alpha-2 codes
- `docs_url` — use `""` if the provider has no public docs URL
- `docs_public` — `false` if the provider restricts API documentation
- `description` — one factual sentence; no marketing language
- `example_prompt` (provider-level) — a complete integration scenario describing what kind
  of app would use this provider (e.g. "Add Wave checkout to my app to accept mobile money
  across West Africa"). This is different from the per-capability `example_prompt` in `schema.json`.

---

### Phase 3 — Implement capabilities one by one

Work through the discovery table in order. Complete all steps for capability N before
starting capability N+1.

**If the table has more than 8 capabilities, dispatch parallel agents by thematic group**
(e.g. payments, customers, webhooks, transfers). Use the `dispatching-parallel-agents`
skill pattern — one agent per group, each with its own slice of the table. Never scaffold
30+ capabilities sequentially in a single context; it degrades quality and risks context loss.

**Step 5. Re-read the relevant docs section.**

Before writing any file for a capability, go back to that specific endpoint's documentation.
Note precisely:
- All request fields: name, type, required/optional, format, enum values
- All response fields: name, type, format, enum values
- All error shapes: codes, messages
- Authentication mechanism: where the credential goes (header / body / query),
  the exact field name, the format string, the env var name
- Any edge cases or warnings mentioned in the docs

**Step 6. Create `specs/{category}/{provider_slug}/{capability}/schema.json`.**

Required fields:
```json
{
  "spec_version": "1.0",
  "provider_api_version": "2024-01-01",
  "capability": "create_payment",
  "capability_type": "synchronous",
  "status": "draft",
  "currency": ["GNF"],
  "auth": {
    "type": "api_key",
    "location": "header",
    "field": "Authorization",
    "format": "Bearer {token}",
    "env_var": "WAVE_API_KEY"
  },
  "endpoint": {
    "method": "POST",
    "url": "https://api.example.com/v1/payments"
  },
  "example_prompt": "Initiate a payment and redirect the user to complete it.",
  "input_schema": {},
  "response_schema": {},
  "error_schema": {},
  "gotchas": [
    "Specific, actionable observation from the docs."
  ]
}
```

Field rules:
- `spec_version` — always `"1.0"`
- `provider_api_version` — use the version string from the docs (e.g. `"v1"`, `"2024-03-29"`).
  If the provider has no versioning, use the date you are writing the spec: `"2026-05-03"`.
- `capability` — snake_case, must match the capability directory name exactly
- `capability_type` — `synchronous`, `asynchronous`, or `webhook`
- `status` — always `"draft"`; never `ready`, `compliant`, or `verified`
- `currency` — must be consistent with `provider.json`'s `country_code` array
- `auth.type` — see auth type reference below
- `auth.location` — `"header"`, `"body"`, or `"query"`
- `auth.env_var` — must be identical across ALL specs for this provider
- `endpoint.url` — full HTTPS URL; for webhooks use `"{your_webhook_url}"` as placeholder
- `example_prompt` (capability-level) — one sentence describing what *this capability* does
  for an agent (e.g. "Initiate a Wave checkout session and get the URL to redirect the user.")
- `input_schema`, `response_schema`, `error_schema` — full JSON Schema objects; `{}` only if genuinely undocumented
- `gotchas` — minimum 1 entry; write specific, actionable observations based on the docs

Fields that must NOT appear in `schema.json` (they belong in `provider.json`):
`provider_slug`, `provider_name`, `category`, `country_code`, `sandbox`, `docs_url`, `docs_public`

**Auth type reference:**

| `type` | When to use | `env_var` stores |
|---|---|---|
| `api_key` | Static secret key passed directly as a credential | The key itself |
| `bearer` | Bearer token in `Authorization` header, but the token is static (not OAuth) | The token itself |
| `oauth2` | Access token must be obtained first via an OAuth2 flow before each call | Base64 of `client_id:client_secret` — the access token is fetched at runtime |
| `basic` | HTTP Basic auth — credentials encoded as `base64(user:password)` | The base64-encoded credentials string |
| `none` | No inbound auth (unsigned webhooks) | — |

For `oauth2`: the `env_var` holds the static credential used to obtain a short-lived access token.
The access token itself is ephemeral — never store it in `env_var`. Document the token exchange
flow in `gotchas`.

**Gotcha writing guide:**

Good:
```
"amount must be a numeric string (e.g. \"1000\"), not a JavaScript number. Passing an integer causes a 400 validation error."
"Auth goes in the body field 'c', not in an HTTP header. Do not use a Bearer token pattern."
"There is no sandbox environment. All calls hit production."
"The OAuth access token is short-lived. Fetch a fresh one before each call — do not hardcode it."
```
Bad:
```
"Read the documentation before using."
"Handle errors carefully."
```

**Step 7. Create `specs/{category}/{provider_slug}/{capability}/canonical_example.ts`.**

Read `references/canonical_example_templates.md` for the full template for each capability type.
Pick the right one based on `capability_type`:

- **synchronous** (common case) — env var check → interfaces → exported function → usage comment
- **asynchronous** (poll-based) — two exported functions: submit + poll, with polling loop in the usage comment
- **HTTP-200-error** — provider always returns 200; check an error code field in the body instead of `response.ok`

Mandatory rules for `canonical_example.ts`:
1. TypeScript strict — must compile with `tsc --noEmit --strict --target ES2020 --module ESNext --moduleResolution bundler --lib ES2020,DOM`, zero errors
2. Native `fetch` only — no axios, no node-fetch, no external imports of any kind
3. All credentials via `process.env` — checked at module level with explicit `throw`
4. Explicit TypeScript interfaces for input, response, and error (no `any` without a comment)
5. Export the main function(s)
6. Usage example in a comment block at the bottom
7. JSDoc header with `@provider`, `@capability`, `@atss`, `@capability_type`
8. `process.env.X` used in the file must exactly match `auth.env_var` in `schema.json`

---

### CHECKPOINT 2 — Per-capability verification (mandatory after each pair)

Before moving to the next capability, verify all of the following:

1. **Fields vs docs** — re-open the docs section for this endpoint and confirm every field in
   `input_schema.properties` appears there. No invented fields. No missing required ones.

2. **Types are precise** — string vs number distinctions matter (e.g. Wave's `amount` is a string).
   Enum values are exhaustive. Optional fields are marked optional.

3. **Auth consistency** — `auth.env_var` in this `schema.json` is identical to every other spec
   you have written for this provider so far.

4. **Gotcha quality** — the gotcha names a specific behaviour, not a general reminder. It should
   prevent a real integration mistake.

5. **`capability_type` is correct** — is the result immediate (synchronous), does the caller need
   to poll (asynchronous), or is this a push event from the provider (webhook)?

5b. **Multi-level auth** — some providers use different credentials for different endpoints
   (e.g. public key for payment initiation, private key for transfers and webhooks management,
   an extra `X-Grant` header + IP whitelist for disbursements). Do not apply one `auth.env_var`
   uniformly to all capabilities. For each capability, check the auth section of that specific
   endpoint in the docs. If the required credential differs, use the correct `env_var`
   (e.g. `PROVIDER_PRIVATE_KEY`) and add a gotcha: "This endpoint requires your private key,
   not the public key used for create_payment. Using the wrong key returns 406."

6. **Webhook rules** — if `capability_type` is `webhook`: `endpoint.url` must be
   `"{your_webhook_url}"` and `auth.type` must be `"none"` (unless the provider signs the
   payload — in that case document the signing mechanism in `gotchas` and set `auth` accordingly).

7. **No migrated fields** — `schema.json` must not contain `provider_slug`, `provider_name`,
   `category`, `country_code`, `sandbox`, `docs_url`, or `docs_public`.

---

### Phase 4 — Validate

**Step 8. Run `npm run validate:changed` during development, `npm run validate` at the end.**

During development (after each capability or small batch):
```bash
npm run validate:changed   # validates only git-changed specs — much faster
```

Final check before declaring done:
```bash
npm run validate           # validates the full registry — catches cross-spec inconsistencies
```

Read every line of output. Fix all failures before continuing.

Common errors and causes:

| Error | Cause | Fix |
|---|---|---|
| `Missing provider.json` | No `provider.json` in provider directory | Create it |
| `schema.json missing required field: "example_prompt"` | Field absent | Add it |
| `schema.json must not contain "provider_slug"` | Migrated field still present | Remove it |
| `gotchas must be a non-empty array` | Empty array or missing | Add at least 1 entry |
| `canonical_example.ts TypeScript error` | Type mismatch | Fix the interface |
| `[CROSS-SPEC] currency` | Currency differs across specs | Align all to the same value |
| `[CROSS-SPEC] provider_api_version` | Version inconsistent across specs | Pick one, apply to all |

Do not close the task until `npm run validate` exits with 0 failures.

---

### Phase 4b — Live API verification (optional but strongly recommended)

Ask the developer to set their sandbox key so you can verify response schemas against the
real API:

```
To verify the response schemas I've written, please run:

  export {PROVIDER}_PUBLIC_KEY=test_xxx   # or whichever key gives read access

This key is used only in your local terminal to run curl calls. It never leaves your
machine. A sandbox or test key is fine — never use a production key here.
Skip this step if you don't have one.
```

If they provide a key:

1. Test every GET endpoint with curl. Use `rtk proxy curl` to bypass RTK token filtering
   and get raw JSON output (plain `curl` may be intercepted and filtered):
   ```bash
   rtk proxy curl -s -H "Authorization: $PROVIDER_PUBLIC_KEY" https://api.example.com/endpoint
   ```

2. For each response, compare actual field names and types against the `response_schema`
   in the spec. Common discrepancies found in practice:
   - Pagination: `total` vs `totals`, `per_page` vs `selected`
   - Absent fields: `id` present in spec but API returns no `id` (uses `reference` instead)
   - Wrong field names: `decimal_places` vs `faction`
   - Wrong HTTP codes: spec says 200, API returns 202
   - Nullable fields not typed as `["string", "null"]`

3. Correct every discrepancy before proceeding. A wrong `response_schema` is worse than
   an empty one — it will mislead AI agents and developers building on this spec.

If they skip this step, add this gotcha to every spec whose response was not verified:
`"response_schema not verified against live API — validate field names and types before shipping."`

---

### CHECKPOINT 3 — Final cross-consistency sweep (mandatory)

After validation passes, do one final read-through of all files created:

1. **Auth env_var** — open every `schema.json`. `auth.env_var` must be identical across all
   specs for this provider (unless the provider genuinely uses separate credentials per
   capability — document that in `gotchas`).

2. **Currency consistency** — `currency[]` must be the same array in every spec. Cross-check
   against `provider.json`'s `country_code`.

3. **`provider_api_version` consistency** — same string in every spec.

4. **Capability table completeness** — return to the discovery table from Checkpoint 1. Every
   row must have a corresponding folder. No folder without a table row.

5. **`provider.json` completeness** — all 10 required fields present and non-empty where required:
   `slug`, `name`, `category`, `country_code`, `website`, `docs_url`, `docs_public`, `sandbox`,
   `description`, `example_prompt`.

6. **No extra files** — each capability folder must contain exactly `schema.json` and
   `canonical_example.ts`. No `package.json`, no `README.md`, no test files.

---

### Phase 5 — Output summary

Print a summary table:

```
Provider:   Wave
Slug:       wave
Category:   payment
Countries:  SN, CI, ML, GN, UG, BF, GM, NE, CM, SL, CD
Sandbox:    false

Capabilities:

  #   Capability                  Type           Status
  1   create_checkout_session     synchronous    draft
  2   verify_payment              synchronous    draft
  3   expire_checkout             synchronous    draft
  4   refund_checkout             synchronous    draft
  5   get_balance                 synchronous    draft
  6   send_payout                 synchronous    draft
  7   webhook_payment_completed   webhook        draft

Validation: 7 passed, 0 failed.

Next steps for the contributor:
  - Review each spec, fill in any fields left as TODO, then manually set
    status from "draft" to "ready" in schema.json once you're satisfied.
  - Open a PR — maintainers will review and eventually set status to "verified"
    after a working example is added to afrotools/examples.
  - Never set status to "verified" yourself.
```

---

## Rules

- Set `status` to `"draft"` in all generated files — only a human maintainer can advance
  status after real-world verification; generating `"compliant"` or `"verified"` would misrepresent
  the spec's validation state.
- Use native `fetch` only in `canonical_example.ts` — npm imports would require contributors
  to manage dependencies, breaking the zero-dependency guarantee of this static registry.
- Don't add a `package.json` inside a spec folder — it would make the spec folder look like
  a project root and confuse tooling that scans for `node_modules`.
- Don't add `provider_slug`, `provider_name`, `category`, `country_code`, `sandbox`, `docs_url`,
  or `docs_public` to `schema.json` — these fields were migrated to `provider.json` so they are
  not duplicated across every capability; the validator rejects them in `schema.json`.
- Keep `auth.env_var`, `currency[]`, and `provider_api_version` identical across all specs for
  the same provider — the validator enforces cross-spec consistency and produces `[CROSS-SPEC]`
  errors that block CI when these diverge.
- Each spec needs at least one specific, actionable gotcha — vague reminders like "check the docs"
  don't help AI agents; only concrete surprises (wrong field type, hidden auth requirement, edge case)
  prevent real integration mistakes.
- `npm run validate` must exit with 0 failures — a broken spec misleads AI agents in production;
  the spec is only as useful as its accuracy.
- Work on a branch, don't push to main — this repo uses squash-merge PRs for a clean history
  and review; direct pushes bypass that.
- Scaffold every capability in the discovery table — missing a capability means AI agents will
  fail silently when they try to call an endpoint that has no spec. If the table has 31 rows,
  create 31 spec folders.
- Dispatch parallel agents when the capability count exceeds 8 — scaffolding 30+ capabilities
  sequentially in a single context degrades quality and risks context loss.
