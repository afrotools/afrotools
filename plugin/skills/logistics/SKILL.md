---
name: logistics
description: >
  Use this skill whenever the user wants to integrate, implement, or test a
  delivery or courier API from an African provider — pricing a delivery,
  booking a courier, tracking a parcel or a driver, cancelling a delivery —
  including Yango Delivery or any provider in the Afro.tools registry.
  Activate even if the user only says "add delivery to checkout", "book a
  courier for this order" or "send the customer a tracking link" — always fetch
  the exact spec before writing any code.
---

# Afro.tools — Logistics skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug, the country/city and the capability from the user's request.
   - Discover what's actually available with `afrotools.list_providers()`: it lists every
     provider with its countries and the exact names of its capabilities. To narrow down, use
     `afrotools.search_specs({ category: "logistics", country_code: "<ISO alpha-2, uppercase>" })`
     (or `provider`) — keep a filter on: a whole-category search can be too large to read.
     Never assume a provider has (or lacks) a spec from memory or from a previous session —
     the registry grows independently of this skill.
   - Capability names are each provider's own: pick them from the provider's `capabilities`
     list, never guess one. A `get_spec` "not found" means the name is wrong, not that the
     provider is missing — check the list again before concluding anything.
   - Coverage is per country and often per city: check the provider's `country_code` and the
     spec's gotchas before promising delivery somewhere.
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
   Deliveries are multi-step (price → create → confirm → track → cancel): fetch the spec of
   every step the user's flow needs, not only the first one, before writing code.

3. Read the spec carefully before writing code:
   - `auth` — how to authenticate (header name, env var)
   - `endpoint` — method and URL
   - `input_schema` — required and optional fields (coordinate order, phone format, ids)
   - `response_schema` — what a success response looks like (status, price, version)
   - `error_schema` — how errors are returned
   - `gotchas` — **always surface these to the user**

4. Implement using the `canonical_example.ts` pattern:
   - Native fetch only — no axios, no node-fetch
   - Credentials from `process.env`, server-side only
   - Keep idempotency keys for create calls and reuse them only on retries, as the spec says
   - Read the delivery status from the provider (status or journal endpoint), not from a
     client-side callback

## Important

Never skip the gotchas. They represent real integration failures. A confirmed delivery
dispatches a real courier: only test against an environment the spec documents.
