# The rules Studio applies

Six rules. Rules 1 to 4 are how the app is built; Studio applies them without asking. Rules 5 and 6
are strongly advised, never forced: say what they catch and roughly what they
cost, and the user decides.

1. **A payment is confirmed only by the server, on a proof its spec trusts, and its amount is
   checked.** The return page never proves a payment: its parameters come from the browser. By
   default the proof is the provider's status capability, called by the server; a webhook alone is
   enough only when its spec says so (its gotchas, or its `canonical_example.ts` fulfils without a
   status call), and only once the server authenticates it as that example does (signature or shared
   secret). Wire the webhook and the status check from their `canonical_example.ts` (same checks, same
   order) and follow their gotchas: when they say an authenticated webhook is enough, do not gate it on
   a status call; when they say never to fulfil on the webhook alone, ask for the status. Compare the paid amount with the order's total kept
   in the app's own records, wherever the proof carries an amount; never copy the amount from the
   provider onto the order. If this rule and a spec seem to disagree, say so to the user before wiring
   it and follow the spec. Why: an Afro.tools webhook example once copied the verified amount instead
   of comparing it (afrotools#164), so any paid amount would have marked the order paid; and Studio
   once gated a Bictorys webhook on a status call and a list endpoint the spec did not prescribe, which
   answered 403, so no payment could be confirmed (afrotools#218).
2. **Nothing is paid or delivered twice.** Send the idempotency key the spec declares on every payment
   or payout, and make fulfilment idempotent: the same webhook can arrive several times. Why: a Bictorys
   payout without its idempotency key failed with a 500 (afrotools#166); retries without one can charge
   twice.
3. **No key in the code, in the browser, or in the chat, and sandbox kept apart from production.** Keys
   live in server-side environment variables (`.env`, outside git). Variables a bundler sends to the
   browser (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, `REACT_APP_`, `PUBLIC_`) never hold a secret. The app
   always knows whether it runs against the sandbox or production. Why: a key in the code or in the page
   is public the day the code or the site is.
   Never read a value out of `.env` to print it, quote it back, or ask the user to confirm it matches —
   not even to recover when `.env` looks wrong (changed unexpectedly, a variable you don't recognize).
   One exception: the `ep-…` compute id of `DATABASE_URL`'s host (no password), printed by the command
   of [stack.md](stack.md) "On the computer" step 1 to check the database branch.
   In that case, ask the user to open the file themselves and read back variable **names** only, or to
   get a new value from the provider and paste it into `.env` directly, never into the chat.
4. **Every message costs money, so a stranger cannot make the app send many.** Anything that sends an
   SMS, a WhatsApp message or a one-time code without someone logged in (sign-up, "send me a code",
   "resend the link") is limited per phone number and per hour, counted on the server in the database
   (not in memory, which a restart or a second server forgets). Why: messages are billed one by one; a
   public form without a limit lets anyone send thousands at the user's expense, a fraud known as SMS
   pumping.
5. **A security audit before going live, strongly advised.** A separate reviewer looks for what the
   author missed. If it finds something serious, warn, let the user choose, and if they go live anyway,
   record it in `.afrotools/accepted-risks.md`.
6. **A code review, strongly advised**, at the end of each feature and before going live, by a separate
   reviewer that gets the code, not the author's conclusions.
