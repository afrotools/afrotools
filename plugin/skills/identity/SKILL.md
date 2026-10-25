---
name: identity
description: >
  Use this skill whenever the user wants to integrate, implement, or test an
  identity verification (KYC) API from an African provider — ID number checks,
  ID document verification with a selfie, AML / sanctions / PEP screening, or
  hosted verification links — including Smile ID or any provider in the
  Afro.tools registry. Activate even if the user only says "add KYC", "verify
  the user's ID card" or "onboard users with an identity check" — always fetch
  the exact spec before writing any code.
---

# Afro.tools — Identity skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug, the country and the capability from the user's request.
   - Discover what's actually available with `afrotools.list_providers()`: it lists every
     provider with its countries and the exact names of its capabilities. To narrow down, use
     `afrotools.search_specs({ category: "identity", country_code: "<ISO alpha-2, uppercase>" })`
     (or `provider`) — keep a filter on: a whole-category search can be too large to read.
     Never assume a provider has (or lacks) a spec from memory or from a previous session —
     the registry grows independently of this skill.
   - Capability names are each provider's own: pick them from the provider's `capabilities`
     list, never guess one. A `get_spec` "not found" means the name is wrong, not that the
     provider is missing — check the list again before concluding anything.
   - Coverage is per country and per ID type: check the provider's `country_code` and the
     spec's gotchas for which ID types each country supports before choosing a capability
     (an ID-number check may exist for one country while another only supports documents).
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
   Identity checks are usually asynchronous: if the capability returns a job id instead of
   a verdict, also fetch the provider's result webhook spec (and its token / auth spec if
   the provider exchanges a key for a short-lived token) before writing code.

3. Read the spec carefully before writing code:
   - `auth` — how to authenticate (header name, env var, token exchange in `gotchas`)
   - `endpoint` — method and URL
   - `input_schema` — required and optional fields (consent is often mandatory)
   - `response_schema` — what a success response looks like
   - `error_schema` — how errors are returned
   - `gotchas` — **always surface these to the user**
   - `status` / `verification` — `ready` means written from the provider's docs, not yet
     tested against the API; a `verified` spec says where it was tested
     (`verification.environment`: `sandbox` or `production`). Tell the user which.
   - `open_questions` — if present, what the docs do not answer: tell the user before relying on it

4. Implement using the `canonical_example.ts` pattern:
   - Native fetch only — no axios, no node-fetch
   - Credentials from `process.env`, server-side only — never ship an API key to the browser
   - Decide the user's verification status from the provider's verified result (webhook or
     server-side call), never from a browser callback or a redirect parameter

## After the integration

When the user confirms the integration works against the real API (sandbox or production), or
you find that the spec is wrong, offer to report it — it is how specs get verified and fixed:

```
afrotools.report_integration({ provider: "<slug>", capabilities: [{ capability: "<capability>", result: "worked" }, …], summary: "<one line>", details: "<what was called, what came back, what differed>" })
```

List every capability the flow used (e.g. payment init, status, webhook), each with its own
result — one report per provider. Give the user the returned link: they choose the environment and
the outcome, check the text, and submit it themselves. Never put API keys, tokens, phone numbers
or personal data in `details`.

## Important

Never skip the gotchas. They represent real integration failures. Identity data is
personal data: don't log it, and only send fictitious test identities to a sandbox.
