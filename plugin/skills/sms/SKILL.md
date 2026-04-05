---
name: afrotools-sms
description: >
  Activate when the user is integrating an SMS API from an African provider
  (NimbaSMS or any SMS provider in the Afro.tools registry). Automatically
  fetches the right spec via MCP so the agent knows the exact endpoint, auth
  format, input/output schemas, and integration gotchas before writing any code.
---

# Afro.tools — SMS skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug and capability from the user's request.
   - Provider slugs: `nimbasms`
   - Capabilities: `send_otp`, `send_bulk`

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
