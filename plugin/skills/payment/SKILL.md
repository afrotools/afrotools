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
   - Providers with specs available: `paycard`, `lengopay`
   - Providers planned (no spec yet): `wave`, `djomy`, `bictorys`
   - If the requested provider has no spec yet:
     1. Call `afrotools.request_spec({ provider: "<slug>", capability: "<capability>" })`
        so the maintainers are notified of the demand.
     2. Tell the user: "The spec for {provider} isn't available yet — I've logged
        your request. You can track available specs with `/afrotools:list`."
     3. Stop — don't attempt to implement without a spec.

2. Call the MCP tool to fetch the spec:
   ```
   afrotools.get_spec({ provider: "<slug>", capability: "<capability>" })
   ```
   If the user is building a full payment flow (checkout + verification + webhook),
   fetch all three capabilities upfront:
   - `create_payment` — to initiate a payment and get the payment URL
   - `verify_payment` — to confirm payment status server-side
   - `webhook_payment_completed` — to handle async callbacks

3. Read the spec carefully before writing code:
   - `auth` — how to authenticate (header name, env var)
   - `endpoint` — method and URL
   - `input_schema` — required and optional fields
   - `response_schema` — what a success response looks like
   - `error_schema` — how errors are returned
   - `gotchas` — **always surface these to the user**

4. Implement using the `canonical_example.ts` pattern:
   - Native fetch only — no axios, no node-fetch
   - Credentials from `process.env`
   - Always verify payment status server-side before fulfilling an order

## Important

Never skip the gotchas. They represent real integration failures.
