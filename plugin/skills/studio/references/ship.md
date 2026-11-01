# Phase: ship

Goal: the app is in production, with the user's explicit go, after the checks.

1. **Run the check yourself**: read [../../check/SKILL.md](../../check/SKILL.md) and follow its steps
   (manual skills cannot be invoked by you, so read the file). Its free script lives in the plugin, at
   `<this skill's base directory>/../check/scripts/scan-secrets.mjs` (the base directory is the folder
   of the Studio skill's `SKILL.md`): run `node "<that path>" .` from the project. Ignore the
   `${CLAUDE_SKILL_DIR}` path written in the check skill: it only works when the user types
   `/afrotools:check`. Fix the blocking points with the user's agreement.
2. **Offer the code review and the security audit**, strongly advised: what they catch, that they use
   tokens. The check's last step is this offer: make it once, not twice. The user decides. With a yes, read [../../review/SKILL.md](../../review/SKILL.md) and follow it
   (a separate reviewer, never your own reading). A blocking point the user
   chooses not to fix goes in `.afrotools/accepted-risks.md`.
3. **Prepare going live** with [vendor/shipping-and-launch.md](vendor/shipping-and-launch.md), kept to
   what this app needs: production access granted by each provider (`.afrotools/studio.md` says whether
   it was asked for; if not, the user asks now, and going live waits for it), the production keys (the user puts them in the host's settings themselves),
   the provider's production address, the webhook address registered with the provider.
   Never state a price or a free-tier limit from memory: send the user to the host's pricing page.
4. **Go live only after the user's explicit go**, and only with an account they created themselves.
   Without an account, stop and tell them what to create. Once it is deployed, the user does the manual
   tests of `docs/plan.md` again, in production, by hand: a first real payment of a small amount through
   the app itself, a real message to their own phone. Never fill in the provider's payment page or
   confirm a payment yourself; give them the steps and ask what they saw. Tell them to announce the app
   only once these pass.
5. **After going live**: for each spec that is not `verified`, offer a report
   (`afrotools.report_integration`) once the user has tried it, as the `payment` skill says: paste the
   whole link it returns, even a long one, and name what to pick in its two lists. Set `phase: done` in
   `.afrotools/studio.md` and tell the user how to come back for changes.
