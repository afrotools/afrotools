# Phase: build

Goal: the app works on the user's computer with sandbox keys, every screen of the plan included.

First, before building anything: if tools named `mcp__playwright__*` are not available and
`playwright_offered` is not `true` in the state file, make the browser offer described in step 7.

1. **Build in small steps**, one feature at a time, following `docs/plan.md` and `docs/design.md`.
   After each feature, run the app and check it yourself before telling the user it works. With
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
   as the `payment` skill says.
5. **Run the app yourself.** Start the dev server on a port nothing listens on (other projects of the
   user often use 3000 and nearby ports), give the user the link, and never ask a non-developer to type a
   command. Before giving a link, check that the page is this app (its title or a text you wrote), not
   another program. Never stop, restart or reuse a process you did not start in this session: if a port
   is taken, pick another one.
6. **Tests**: write tests for what moves money (payment confirmation, amount check, a duplicate webhook)
   and run them. Prove one real sandbox call to the payment provider (creating a payment link) before
   saying payments work: mocked tests alone do not prove it.
7. **Check the screens in a browser.** If tools named `mcp__playwright__*` are available, open each
   screen at a phone's width (390 × 844), use it as the user would (create a client, an order, a payment
   link), take a screenshot, and fix what is wrong before showing it. If they are not available and
   `playwright_offered` is `false`, offer once, at the start of this phase: a browser you drive yourself
   to check every screen, free, using the Chrome already installed (no big download). With a yes, run
   `claude mcp add playwright -- npx @playwright/mcp@latest --browser chrome --headless` (it is added to
   this project only), tell the user to reopen the session for it to load, and set
   `playwright_offered: true`. Without it, check pages with `curl` and describe what the user should see;
   if the project already uses Playwright, follow [vendor/webapp-testing.md](vendor/webapp-testing.md).
8. **Review, offered once per feature**: when a feature is done, offer a code review in one sentence
   (what it catches, that it uses tokens). Count each refusal in `review_declined` in the state file;
   at 2, stop offering it until the ship phase, in this session and the next ones. The review itself: read [../../review/SKILL.md](../../review/SKILL.md) and follow it.
9. **When the plan's screens all work** with sandbox keys, record it in `.afrotools/studio.md`, set
   `phase: ship`, and say in one sentence what the next phase does.
