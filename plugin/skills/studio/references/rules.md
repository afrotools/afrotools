# The rules Studio applies

Six rules. Rules 1 to 4 are how the app is built; Studio applies them without asking. Rules 5 and 6
are strongly advised, never forced: say what they catch and roughly what they
cost, and the user decides.

1. **A payment is confirmed only by the server, and its amount is checked.** Neither the return page
   nor a webhook alone proves a payment: the server asks the provider for the payment's status, then
   compares the paid amount with the order's total. Never copy the amount from the provider onto the
   order. Why: an Afro.tools webhook example once copied the verified amount instead of comparing it
   (afrotools#164), so any paid amount would have marked the order paid.
2. **Nothing is paid or delivered twice.** Send the idempotency key the spec declares on every payment
   or payout, and make fulfilment idempotent: the same webhook can arrive several times. Why: a Bictorys
   payout without its idempotency key failed with a 500 (afrotools#166); retries without one can charge
   twice.
3. **No key in the code or in the browser, and sandbox kept apart from production.** Keys live in
   server-side environment variables (`.env`, outside git). Variables a bundler sends to the browser
   (`NEXT_PUBLIC_`, `VITE_`, `EXPO_PUBLIC_`, `REACT_APP_`, `PUBLIC_`) never hold a secret. The app always
   knows whether it runs against the sandbox or production. Why: a key in the code or in the page is
   public the day the code or the site is.
4. **Every message costs money, so a stranger cannot make the app send many.** Anything that sends an
   SMS, a WhatsApp message or a one-time code without someone logged in (sign-up, "send me a code",
   "resend the link") is limited per phone number and per hour, counted on the server in the database
   (not in memory, which a restart or a second server forgets), and refuses numbers outside the countries
   the app serves. Why: messages are billed one by one; a public form without a limit lets anyone send
   thousands at the user's expense, a fraud known as SMS pumping.
5. **A security audit before going live, strongly advised.** A separate reviewer looks for what the
   author missed. If it finds something serious, warn, let the user choose, and if they go live anyway,
   record it in `.afrotools/accepted-risks.md`.
6. **A code review, strongly advised**, at the end of each feature and before going live, by a separate
   reviewer that gets the code, not the author's conclusions.
