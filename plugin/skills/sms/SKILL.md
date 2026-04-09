---
name: afrotools-sms
description: >
  Use this skill whenever the user wants to send SMS messages, OTPs, or bulk
  notifications via an African SMS provider — including NimbaSMS or any provider
  in the Afro.tools registry. Activate even for "send a verification code" or
  "add SMS notifications", not just explicit mentions of a provider name.
---

# Afro.tools — SMS skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug and capability from the user's request.
   - Provider slugs: `nimbasms`
   - Capabilities: `send_otp`, `send_bulk`
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

## Important

Never skip the gotchas. They represent real integration failures.
