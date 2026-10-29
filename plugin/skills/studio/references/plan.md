# Phase: plan

Goal: a short plan the user agrees with, and the stack and the hosting chosen.

1. **Write the plan** in `docs/plan.md` in the project, one to two pages, following
   [vendor/create-prd.md](vendor/create-prd.md) in its lean form. Cover: who uses the app, what each
   screen does, the African building blocks and their providers (from `.afrotools/studio.md`), what the
   first version leaves out. Apply [rules.md](rules.md): say in the plan how payments are confirmed
   and how double payment is avoided, in plain words.
   With `level: explain`, show the user a summary of five to eight lines, not the whole document; tell
   them where it is if they want to read it.
2. **Choose the stack and the hosting** yourself and explain the choice in two or three sentences
   about what it means for them (cost to start, who keeps it running, how they open the app). Weigh:
   - the people using it (phone first, weak connection: light pages, works offline when it can);
   - what the providers need: a payment webhook needs a public `https` address on the server;
   - who will maintain it: a non-developer needs managed hosting, not a server to administer.

   Never state a price, a free-tier limit or a delay from memory: say where to check it (the host's
   pricing page). Ask only if two options are close and the difference matters to them.
3. **Personal data**: client names, phone numbers and measurements are personal data. Plan that only
   the people the user names can see them, and say so in one sentence.
4. **Agree**: one question — does the plan suit them, anything to add or remove? Change the plan
   until it does, keeping the first version small.

   If superpowers is installed, you may use its brainstorming for this phase, but keep to these steps:
   few questions, no extra documents.
5. **Record** the stack, the hosting and the plan's path in `.afrotools/studio.md`, set `phase: design`,
   and say in one sentence what the next phase does.
