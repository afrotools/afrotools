---
name: check
description: >
  Pre-production check of an app that uses African payment or messaging APIs: looks for keys in the
  code or sent to the browser (a free script, no AI), then checks that payments are confirmed
  server-side with the amount compared, that nothing is paid or delivered twice, and that webhooks are
  verified, against the Afro.tools specs of the providers used. Invoke with: /afrotools:check.
  Afro.tools Studio runs it before going live. Manual invocation only.
disable-model-invocation: true
---

# /afrotools:check

The cheap check that always runs before going live. Speak to the user in their language, in plain
words; report each problem as what could go wrong for them, then what you change.

1. **Keys** (rule 3): run the free script on the project, no AI involved:

   ```bash
   node "${CLAUDE_SKILL_DIR}/scripts/scan-secrets.mjs" .
   ```

   Exit 0: nothing found. Exit 1: each line is `file:line: reason`; fix each one (move the value to
   `.env`, read it with `process.env` on the server only, rename a variable a bundler sends to the
   browser). Exit 2: a file could not be read; say which.

2. **Payments and webhooks** (rules 1 and 2). For each provider the app uses (from
   `.afrotools/studio.md`, or the code), fetch its specs: `afrotools.get_spec()` for the payment, its
   status and its webhook. Then read the code that handles them and check, one line each, yes or no
   with the file and line:
   - a payment is marked paid only after the server asked the provider for its status, never on the
     return page or the webhook alone;
   - the verified amount is compared with the order's total, never copied onto the order;
   - the idempotency key the spec declares is sent on every payment and payout;
   - handling the same webhook twice does not deliver or credit twice;
   - the webhook's signature is verified when the spec defines `webhook.signature`;
   - every gotcha of these specs that applies to the code is handled.

   A spec's gotcha may make a rule hard (for example a status call that fails in the sandbox): say so,
   and keep the payment pending rather than confirming it on a weaker proof.

3. **Report** in two groups: **blocking** (money or customer data at risk) and **can wait**. Fix what
   you can with the user's agreement, then run the check again.

4. **Offer the deeper checks**, strongly advised, never forced: a code review and a security audit by a
   separate reviewer (`/afrotools:review`), saying what they catch and that they use tokens (the
   assistant's usage, included in their plan up to a limit or billed by use).
