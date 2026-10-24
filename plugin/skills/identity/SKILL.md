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
   - Discover what's actually available with `afrotools.search_specs({ category: "identity" })`
     or `afrotools.list_providers()`. Never assume a provider has (or lacks) a spec from
     memory or from a previous session — the registry grows independently of this skill.
   - Coverage is per country and per ID type: check the provider's `country_code` and the
     spec's gotchas for which ID types each country supports before choosing a capability
     (an ID-number check may exist for one country while another only supports documents).
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

4. Implement using the `canonical_example.ts` pattern:
   - Native fetch only — no axios, no node-fetch
   - Credentials from `process.env`, server-side only — never ship an API key to the browser
   - Decide the user's verification status from the provider's verified result (webhook or
     server-side call), never from a browser callback or a redirect parameter

## Important

Never skip the gotchas. They represent real integration failures. Identity data is
personal data: don't log it, and only send fictitious test identities to a sandbox.
