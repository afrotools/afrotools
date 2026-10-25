---
name: payment
description: >
  Use this skill whenever the user wants to integrate, implement, or test a
  payment API from an African provider — including Paycard, LengoPay, Wave,
  Djomy, Bictorys, or any provider in the Afro.tools registry. Activate even
  if the user only says "add payment", "connect to Paycard", or "implement a
  checkout flow" — always fetch the exact spec before writing any code.
---

# Afro.tools — Payment skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug and capability from the user's request.
   - Discover what's actually available with `afrotools.list_providers()`: it lists every
     provider with its countries and the exact names of its capabilities. To narrow down, use
     `afrotools.search_specs({ category: "payment", country_code: "<ISO alpha-2, uppercase>" })`
     (or `provider`) — keep a filter on: a whole-category search can be too large to read.
     Never assume a provider has (or lacks) a spec from memory or from a previous session —
     the registry grows independently of this skill.
   - Capability names are each provider's own: pick them from the provider's `capabilities`
     list, never guess one. A `get_spec` "not found" means the name is wrong, not that the
     provider is missing — check the list again before concluding anything.
   - Only if the provider is absent from `list_providers()`, or none of its capabilities
     covers what the user needs:
     1. Call `afrotools.request_spec({ provider: "<slug>", capability: "<capability>" })`
        so the maintainers are notified of the demand.
     2. Tell the user: "The spec for {provider} isn't available yet — I've logged
        your request. You can track available specs with `/afrotools:list`."
     3. Stop — don't attempt to implement without a spec.

2. Call the MCP tool to fetch the spec:
   ```
   afrotools.get_spec({ provider: "<slug>", capability: "<capability>" })
   ```
   If the user is building a full payment flow, fetch upfront the provider's capability for
   each step, choosing the names from its `capabilities` list (they differ per provider):
   - initiating the payment (and getting the payment URL, if it is a hosted checkout)
   - confirming the payment status server-side
   - the payment webhook, for async callbacks

3. Read the spec carefully before writing code:
   - `auth` — how to authenticate (header name, env var)
   - `endpoint` — method and URL
   - `input_schema` — required and optional fields
   - `response_schema` — what a success response looks like
   - `error_schema` — how errors are returned
   - `gotchas` — **always surface these to the user**
   - `status` / `verification` — `ready` means written from the provider's docs, not yet
     tested against the API; a `verified` spec says where it was tested
     (`verification.environment`: `sandbox` or `production`). Tell the user which.
   - `open_questions` — if present, what the docs do not answer: tell the user before relying on it

4. Implement using the `canonical_example.ts` pattern:
   - Native fetch only — no axios, no node-fetch
   - Credentials from `process.env`
   - Always verify payment status server-side before fulfilling an order

## After the integration

Reports are how specs get verified and fixed. The user usually tests later, so do not wait for
them to say it worked:

- **The spec is not `verified`** — when you finish the integration, tell the user once that this
  spec has never been tested against the provider's API, and that when they have tested it
  (sandbox or production) you can prepare a report: a working report makes it `verified`,
  credited to them.
- **The spec is `verified`** — offer a report only if something failed.
- **The spec is wrong** (the API does not match it) — offer a report right away.

When they come back with a result:

```
afrotools.report_integration({ provider: "<slug>", capabilities: [{ capability: "<capability>", result: "worked" }, …], summary: "<one line>", details: "<what was called, what came back, what differed>" })
```

List every capability the flow used (e.g. payment init, status, webhook), each with its own
result — one report per provider. Give the user the returned link: they choose the environment and
the outcome, check the text, and submit it themselves. Never put API keys, tokens, phone numbers
or personal data in `details`.

## Important

Never skip the gotchas. They represent real integration failures.
