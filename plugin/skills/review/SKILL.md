---
name: review
description: >
  Code review or security audit of an app built with Afro.tools, by a separate reviewer that gets the
  code, not the author's conclusions: correctness, readability, architecture, security and
  performance, plus the Afro.tools payment rules and the gotchas of the providers used.
  Invoke with: /afrotools:review [audit]. Manual invocation only.
disable-model-invocation: true
---

# /afrotools:review

Strongly advised, never forced: the user decides. Speak to them in their language, in plain words.

- `/afrotools:review` — a **code review**, based on
  [../studio/references/vendor/code-review-and-quality.md](../studio/references/vendor/code-review-and-quality.md).
- `/afrotools:review audit` — a **security audit**, based on
  [../studio/references/vendor/security-and-hardening.md](../studio/references/vendor/security-and-hardening.md)
  and [../studio/references/vendor/webhook-handler-patterns.md](../studio/references/vendor/webhook-handler-patterns.md).

Both add [../studio/references/rules.md](../studio/references/rules.md) and the gotchas of the
providers the app uses (`afrotools.get_spec()`).

## Workflow

1. **Delegate to a separate reviewer**: start a subagent (the Agent tool) and give it the files or the
   diff to review, the base document above, `rules.md` and the gotchas. Do not give it your own
   conclusions or what you think is fine: a reviewer told what to find confirms it. If you cannot start
   a subagent, tell the user to run `/afrotools:review` in a new session, so the reviewer has not seen
   the code being written.
2. **Sort what comes back** into **blocking** (money, customer data or keys at risk) and **can wait**,
   and check each blocking point against the code yourself before reporting it.
3. **For each blocking point**: say what could happen in plain words, propose the fix, and let the user
   choose. If they go live without fixing it, add an entry to `.afrotools/accepted-risks.md`:

   ```
   ## <ISO date> — rule <n>: <finding>
   Why: <the user's reason, in their words>
   Found by: check | review | audit
   ```

   Never go live yourself because the user declined a fix; going live always needs their explicit go.
