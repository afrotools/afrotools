# Phase: ship

Goal: the app is in production, with the user's explicit go, after the checks.

1. **Run the check yourself**: read [../../check/SKILL.md](../../check/SKILL.md) and follow its steps
   (manual skills cannot be invoked by you, so read the file). Its free script is at the path Studio's
   SKILL.md gives under "Always" (`…/skills/check/scripts/scan-secrets.mjs`): run `node "<that path>" .`
   from the project. If that path still reads `${CLAUDE_PLUGIN_ROOT}` literally, it is the plugin's
   folder: the one that holds `skills/`, three levels above this file (`skills/studio/references/`). Ignore the `${CLAUDE_SKILL_DIR}` path written in the check skill:
   it is only filled in when the user types `/afrotools:check`. Fix the blocking points with the user's
   agreement.
2. **Offer the code review and the security audit**, strongly advised: what they catch, that they use
   tokens. The check's last step is this offer: make it once, not twice. The user decides. With a yes, read [../../review/SKILL.md](../../review/SKILL.md) and follow it
   (a separate reviewer, never your own reading). A blocking point the user
   chooses not to fix goes in `.afrotools/accepted-risks.md`.
3. **Prepare going live** with [vendor/shipping-and-launch.md](vendor/shipping-and-launch.md), kept to
   what this app needs: production access granted by each provider (`.afrotools/studio.md` says whether
   it was asked for; if not, the user asks now, and going live waits for it), the production keys, the
   provider's production address, the webhook address registered with the provider. For the default stack
   (`.afrotools/studio.md` says which), follow "Going live" in [stack.md](stack.md) (its order: the way the
   code reaches the host, the database joined to the project, the plan, the production variables, the
   webhook address, the domain, the backups and the way back), re-reading each page it links before giving
   a step. For another host,
   fetch its documentation page on environment variables now, never from memory, and give the user the
   exact steps with the link; they enter the values themselves, never in the chat. Offer their own
   domain name, optional (it can come later), the same way from the host's page on domains. Before going
   live, turn on the host's data backups and make sure the previous version can be put back in one
   step; tell the user where both are. If the host offers neither, say so.
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
