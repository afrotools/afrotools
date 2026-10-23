---
name: communications
description: >
  Use this skill whenever the user wants to send SMS, OTPs, verification codes,
  bulk notifications, WhatsApp messages, USSD menus, voice calls (voix), or
  transactional email via an African communications provider — including
  NimbaSMS, Africa's Talking, or any provider in the Afro.tools registry.
  Activate even for "send a verification code", "add SMS notifications" or
  "build a USSD menu", not just explicit mentions of a provider name.
---

# Afro.tools — Communications skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug, the channel (`sms`, `whatsapp`, `ussd`, `voice`,
   `email`) and the capability from the user's request.
   - Discover what's actually available with `afrotools.search_specs({ category: "communications" })`
     or `afrotools.list_providers()`. Never assume a provider has (or lacks) a spec from
     memory or from a previous session — the registry grows independently of this skill.
   - If the user needs a specific channel, keep only providers whose `channels` includes
     it. `channels` lists what the provider offers, not which capabilities have a spec —
     still confirm the capability itself is returned before implementing.
   - If the requested provider or capability isn't returned:
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
