# Phase: build

Goal: the app works on the user's computer with sandbox keys, every screen of the plan included.

1. **Build in small steps**, one feature at a time, following `docs/plan.md` and `docs/design.md`.
   After each feature, run the app and check it yourself before telling the user it works. With
   `level: explain`, tell the user in one sentence what now works and how to see it.
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
5. **Tests**: write tests for what moves money (payment confirmation, amount check, a duplicate webhook)
   and run them; for screens, use [vendor/webapp-testing.md](vendor/webapp-testing.md) if the project
   has Playwright, otherwise check them in the browser yourself.
6. **Review, offered once per feature**: when a feature is done, offer a code review in one sentence
   (what it catches, that it uses tokens). If the user declines twice, stop offering it until the ship
   phase. The review itself comes with `/afrotools:review`.
7. **When the plan's screens all work** with sandbox keys, record it in `.afrotools/studio.md`, set
   `phase: ship`, and say in one sentence what the next phase does.
