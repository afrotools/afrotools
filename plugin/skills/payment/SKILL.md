---
name: afrotools-payment
description: >
  Activate when the user is integrating a payment API from an African provider
  (Paycard, Wave, LengoPay, Djomy, Bictorys, or any payment provider in the
  Afro.tools registry). Automatically fetches the right spec via MCP so the
  agent knows the exact endpoint, auth format, input/output schemas, and
  integration gotchas before writing any code.
---

# Afro.tools — Payment skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug and capability from the user's request.
   - Provider slugs: `paycard`, `wave`, `lengopay`, `djomy`, `bictorys`
   - Capabilities: `create_payment`, `verify_payment`, `webhook_payment_completed`

2. Call the MCP tool to fetch the spec:
   ```
   afrotools.get_spec({ provider: "<slug>", capability: "<capability>" })
   ```

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
