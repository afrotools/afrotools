# Phase: plan

Goal: a short plan the user agrees with, and the stack and the hosting chosen.

1. **Write the plan** in `docs/plan.md` in the project, one to two pages, following
   [vendor/create-prd.md](vendor/create-prd.md) in its lean form. Cover: who uses the app, what each
   screen does (as a checklist, `- [ ] <screen>`: the build phase ticks each one when it works, and the
   user sees what is left), the African building blocks and their providers (from `.afrotools/studio.md`),
   what the first version leaves out, and the **manual tests**: for each screen that moves money or sends a
   message, what the user will do by hand and what they should see (pay a test order, receive the SMS on
   their phone). The agent never does these in their place. If the app takes payments, include a page
   for the owner listing pending and failed payments, to check again with the provider or retry: once
   live, a confirmation can be missed. Apply [rules.md](rules.md): say in the plan how payments are confirmed
   and how double payment is avoided, in plain words.
   With `level: explain`, show the user a summary of five to eight lines, not the whole document; tell
   them where it is if they want to read it.
2. **Choose the stack, the hosting and the database** yourself and explain the choice in two or three
   sentences about what it means for them (cost to start, who keeps it running, how they open the app,
   where their data is and who backs it up). With `level: quiet`, propose the three in one line each and
   let the developer change them. Weigh:
   - the people using it (phone first, weak connection: light pages, works offline when it can);
   - what the providers need: a payment webhook needs a public `https` address on the server;
   - who will maintain it: a non-developer needs managed hosting, not a server to administer;
   - login, if the app needs one: the host's own or a recognised login service, never written by hand;
   - the data: a database managed by the host or by a recognised service, backed up by them, never a
     file on the server or in the project (gone at the first deploy), and the same kind of database on
     the computer and in production (a second, test database at the same service serves the computer).

   Never state a price, a free-tier limit or a delay from memory: say where to check it (the host's
   pricing page). Ask only if two options are close and the difference matters to them.
3. **Personal data**: client names, phone numbers and measurements are personal data. Plan that only
   the people the user names can see them, and say so in one sentence.
4. **Agree**: one question — does the plan suit them, anything to add or remove? Change the plan
   until it does, keeping the first version small.

   If superpowers is installed, you may use its brainstorming for this phase, but keep to these steps:
   few questions, no extra documents.
5. **Record** the stack, the hosting, the database and the plan's path in `.afrotools/studio.md`, set `phase: design`,
   and say in one sentence what the next phase does.
