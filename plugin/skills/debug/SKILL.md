---
name: debug
description: >
  Use this skill when the user has a failing or broken Afro.tools integration —
  wrong status codes, auth errors, webhook not firing, unexpected response fields,
  or any runtime error from a Paycard, LengoPay, NimbaSMS, or other Afro.tools
  provider. Activate even if the user just pastes an error without context.
---

# Afro.tools — Debug skill

When this skill activates, fetch the spec for the affected provider and capability,
then systematically compare it against the user's implementation to find the gap.

## Workflow

1. Identify the provider slug and capability from the error, code snippet, or user
   description. Ask if unclear — don't guess.

2. Fetch the spec:
   ```
   afrotools.get_spec({ provider: "<slug>", capability: "<capability>" })
   ```

3. **Check gotchas first.** Most integration failures map directly to a documented
   gotcha. Read every entry before looking elsewhere.

4. Cross-check the implementation against the spec:
   - **Auth** — correct field name, location (header vs body), format string
   - **Endpoint** — correct method and URL, path params in the right place
   - **Field names** — provider fields are often non-standard (e.g. `paycard-amount`,
     not `amount`); compare the user's payload against `input_schema`
   - **Status values** — enums are case-sensitive (e.g. LengoPay uses `SUCCESS`,
     not `success`); `code: 0` on Paycard means "found", not "paid"
   - **Webhook** — returning HTTP 200 immediately, not fulfilling on callback alone,
     HTTPS required for some providers

5. Surface the diagnosis clearly:
   - Quote the relevant spec field or gotcha
   - Show what the code does vs. what the spec requires
   - Provide a minimal corrected snippet
