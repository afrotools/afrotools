---
name: language
description: >
  Use this skill whenever the user wants to integrate, implement, or test a speech or
  language API for African languages — speech-to-text / transcription of Wolof, Swahili,
  Hausa, Yoruba, Pulaar, Amharic and other African languages or accents, post-processing
  of transcripts, or text-to-speech (voices in African languages or accents) — including
  Intron or any provider in the Afro.tools registry. Activate even if the user only says
  "transcribe these voice notes", "add speech recognition in Swahili", "summarize recorded
  calls" or "read this message aloud in Wolof" — always fetch the exact spec before writing any code.
---

# Afro.tools — Language skill

When this skill activates, use the `afrotools` MCP server to retrieve the spec
for the target provider and capability before writing any implementation code.

## Workflow

1. Identify the provider slug, the language and the capability from the user's request.
   - Discover what's actually available with `afrotools.search_specs({ category: "language" })`
     or `afrotools.list_providers()`. Never assume a provider has (or lacks) a spec from
     memory or from a previous session — the registry grows independently of this skill.
   - Coverage is per language, not per country: check the spec's input schema (language
     code enum) and gotchas for the exact code to send — a language may only be supported
     as a code-switched model (e.g. mixed with English).
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
   If the capability returns a job, file or text id instead of a result, also fetch the
   provider's status spec before writing code, and check the gotchas for duration or
   character limits.

3. Read the spec carefully before writing code:
   - `auth` — how to authenticate (header name, env var)
   - `endpoint` — method and URL
   - `input_schema` — required and optional fields, and whether the body is multipart/form-data or JSON
   - `response_schema` — what a success response looks like
   - `error_schema` — how errors are returned
   - `gotchas` — **always surface these to the user**

4. Implement using the `canonical_example.ts` pattern:
   - Native fetch only — no axios, no node-fetch
   - Credentials from `process.env`, server-side only — never ship an API key to the browser
   - For text-to-speech, pick the voice (language, accent, gender) from the combinations the
     spec lists — an accent outside its language is rejected
   - For a multipart upload, use `FormData` and let fetch set the boundary — don't set
     `Content-Type` by hand

## Important

Never skip the gotchas. They represent real integration failures. Recordings and transcripts
are personal data: don't log them.
