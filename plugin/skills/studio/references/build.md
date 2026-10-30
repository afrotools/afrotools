# Phase: build

Goal: the app works on the user's computer with sandbox keys, every screen of the plan included.

First, before building anything: if browser tools (`mcp__playwright__*`, or
`mcp__plugin_playwright_playwright__*` from the Playwright plugin) are not available and
`playwright_offered` is not `true`, offer once a browser you drive yourself to check every screen, free,
using the Chrome already installed. With a yes, run `claude mcp add playwright -- npx @playwright/mcp@latest --browser chrome --headless` (it is added to
this project only), set `playwright_offered: true`, then tell the user to reopen their agent here and type
`/afrotools:studio` again. Without a yes, set `playwright_offered: true` too.

1. **Build in small steps**, one feature at a time, following `docs/plan.md`, the direction recorded
   in `.afrotools/studio.md` (`docs/design.md`, or `DESIGN.md` written by Impeccable) and
   `docs/preview.html`: reuse the preview's colours, text sizes and spacing as they are, and compare each
   built screen with it. After each feature, run the app and check it yourself before telling the user it works. With
   `level: explain`, tell the user in one sentence what now works and how to see it.

   **Keep going without waiting for a go.** Once the keys are in, build feature after feature in the
   same turn. Answer the user's questions briefly, then carry on building; never end a message with
   "I'll start with…" or "I'll continue with…": do it, then say what works. Stop only to ask for
   something only they can give (a key, a decision) or when the phase is done.
2. **African building blocks** go through the afrotools skills, never from memory: for payments, the
   `payment` skill (`afrotools.get_spec()` for the payment, its status and its webhook); for SMS,
   WhatsApp and OTP, the `communications` skill. Apply [rules.md](rules.md) rules 1 to 3. WhatsApp
   webhooks follow [vendor/whatsapp-webhooks.md](vendor/whatsapp-webhooks.md); any webhook follows
   [vendor/webhook-handler-patterns.md](vendor/webhook-handler-patterns.md).
3. **Keys**: when a feature needs them, list the variable names and where to put them (`.env` at the
   project root, already ignored by git: check `.gitignore`), then wait until the user says they are in.
   Never ask for the values. Start with the sandbox keys; the app shows clearly that it runs in test mode.
4. **A spec that is not `verified`** may be wrong: say so when you wire it, test it with the user's own
   number or account first, and offer a report (`afrotools.report_integration`) once it works or fails,
   as the `payment` skill says: paste the whole link it returns, even a long one (it carries the text), and
   name what to pick in its two lists (environment, outcome). Offer only checks a spec allows: when no spec reads the delivery status
   (only a webhook, which needs a public address), the user's phone is the proof; never promise to "look
   at the delivery report".
5. **Run the app yourself.** Start the dev server on a port nothing listens on (other projects of the
   user often use 3000 and nearby ports), give the user the link, and never ask a non-developer to type a
   command. Before giving a link, check that the page is this app (its title or a text you wrote), not
   another program. Never stop, restart or reuse a process you did not start in this session: if a port
   is taken, pick another one.
6. **Tests**: write tests for what moves money (payment confirmation, amount check, a duplicate webhook)
   and run them. Mocked tests alone do not prove the payment: prove it through the app, not beside it.
   Use the app's own payment action (the button that starts a payment or makes a payment link, in the
   browser or by calling the app's route) until the provider's payment page opens: that proves the app talks to the provider with the sandbox keys. Stop there.
7. **Manual tests stay the user's.** Never fill in a provider's payment page yourself (card, phone
   number, code, QR code) and never confirm a payment in the user's place: paying, and receiving an SMS
   or a WhatsApp message on their phone, are tests the user does by hand, always. When such a screen
   works, give them the steps in a few lines: what to tap in the app, which test method to choose on the
   provider's page, what they should then see in the app. The test method (test card, test wallet, test
   number) comes only from the spec or the provider's documentation; if neither gives one, say so and
   tell them to ask the provider: never invent one. On their computer, the provider's confirmation
   (webhook) cannot reach the app without a public address: so the app asks the provider for the status
   itself (rule 1), when the customer comes back and with a "check the payment" button on a pending
   order. Ask what they saw, and use it in the report (step 4).
8. **Check the screens in a browser.** If browser tools (`mcp__playwright__*`, or
   `mcp__plugin_playwright_playwright__*` from the Playwright plugin) are available, open each
   screen at a phone's width (390 × 844), use it as the user would (create a client, an order, a payment
   link, stopping at the provider's page: never fill it in), take a screenshot, compare it with
   `docs/preview.html`, and fix what is wrong before showing it. Without them, check pages with `curl` and describe what the user should see;
   if the project already uses Playwright, follow [vendor/webapp-testing.md](vendor/webapp-testing.md).
9. **Review, offered once per feature**: when a feature is done, offer a code review in one sentence
   (what it catches, that it uses tokens). Count each refusal in `review_declined` in the state file;
   at 2, stop offering it until the ship phase, in this session and the next ones. The review itself: read [../../review/SKILL.md](../../review/SKILL.md) and follow it.
10. **When the plan's screens all work** with sandbox keys: give the user the list of manual tests from
   `docs/plan.md`, one line each, marked done or still to do. If the `impeccable` skill is available,
   `impeccable_use` is not `no` and `polish_offered` is not `true`, offer its polish pass on the main screens (`/impeccable polish <screen>`, or
   `/impeccable:impeccable polish <screen>`), saying it uses tokens, and set
   `polish_offered: true`. Then record it in
   `.afrotools/studio.md`, set `phase: ship`, and say in one sentence what the next phase does.
