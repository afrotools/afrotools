---
name: afrotools-new
description: >
  Scaffold a new ATSS spec (schema.json + canonical_example.ts) for a provider
  and capability. Manual invocation only.
disable-model-invocation: true
---

# /afrotools:new

Scaffolds a new spec folder for a provider and capability, pre-filled with the
correct ATSS structure and ready to complete.

## Usage

```
/afrotools:new <category> <provider_slug> <capability>
```

Examples:
```
/afrotools:new payment wave create_payment
/afrotools:new sms mynewprovider send_otp
```

## Workflow

1. Parse the three arguments: `category`, `provider_slug`, `capability`.

2. Read `schema.template.json` and `specs/CLAUDE.md` to get the exact field rules
   and canonical_example.ts format before generating anything.

3. Create the folder `specs/{category}/{provider_slug}/{capability}/`.

4. Generate `schema.json` with all required ATSS fields:
   - Set `status` to `"draft"` — never `compliant` or `verified`
   - Fill known fields from the arguments (`category`, `capability`, `provider_slug`)
   - Leave unknown fields (endpoint URL, auth format, schemas) as `"TODO"` strings
     so the contributor knows exactly what to complete

5. Generate `canonical_example.ts` with the correct structure:
   - JSDoc header (`@provider`, `@capability`, `@atss`, `@capability_type`)
   - Env var check at the top
   - TypeScript interfaces for input, response, and error
   - Main function using native `fetch` only — no npm imports
   - Usage example in a comment block

6. Run `npm run validate` and show the output.

7. List the fields the contributor still needs to fill in before the spec can
   reach `compliant` status.

## Rules

- `status` stays `"draft"` until `npm run validate` passes with zero errors
- Native fetch only in `canonical_example.ts` — no axios, no node-fetch, no imports
- Never add a `package.json` inside the spec folder
