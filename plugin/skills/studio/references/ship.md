# Phase: ship

Goal: the app is in production, with the user's explicit go, after the checks.

1. **Run the check yourself**: read [../../check/SKILL.md](../../check/SKILL.md) and follow its steps
   (manual skills cannot be invoked by you, so read the file). Its free script is
   `../../check/scripts/scan-secrets.mjs`, next to that file: run it with `node <that path> .`. Fix the
   blocking points with the user's agreement.
2. **Offer the code review and the security audit**, strongly advised: what they catch, that they use
   tokens. The user decides. With a yes, read [../../review/SKILL.md](../../review/SKILL.md) and follow it
   (a separate reviewer, never your own reading). A blocking point the user
   chooses not to fix goes in `.afrotools/accepted-risks.md`.
3. **Prepare going live** with [vendor/shipping-and-launch.md](vendor/shipping-and-launch.md), kept to
   what this app needs: the production keys (the user puts them in the host's settings themselves),
   the provider's production address, the webhook address registered with the provider, a first real
   payment of a small amount by the user.
   Never state a price or a free-tier limit from memory: send the user to the host's pricing page.
4. **Go live only after the user's explicit go**, and only with an account they created themselves.
   Without an account, stop and tell them what to create.
5. **After going live**: for each spec that is not `verified`, offer a report
   (`afrotools.report_integration`) once the user has tried it, as the `payment` skill says. Set
   `phase: ship` done in `.afrotools/studio.md` and tell the user how to come back for changes.
