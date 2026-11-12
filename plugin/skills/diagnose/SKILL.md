---
name: diagnose
description: >
  Use when afro.tools Studio or an afrotools skill did not work as expected: prepares a cleaned bug
  report and a link to a prefilled GitHub issue that the user reviews and submits themselves.
  Invoke with: /afrotools:diagnose. Manual invocation only.
disable-model-invocation: true
---

# /afrotools:diagnose

Turns "Studio did something wrong" into a report the maintainers can act on, without a support call.
Speak to the user in their language; the report itself is written in English.

## Workflow

1. **Summarise the session** in four fields:
   - `title`: one line naming the problem.
   - `what_happened`: what the user expected, what Studio or the skill did instead, any error message.
   - `steps`: what was asked or run, in order, one per line.
   - `agent`: the agent in use (e.g. `claude-code`). `plugin_version`: the `version` in this plugin's
     `.claude-plugin/plugin.json`.

   Leave out code, file contents and anything about the user's customers. Never include API keys,
   tokens, phone numbers or e-mail addresses, even partially.

2. **Build the link**: pass the report as JSON on stdin to the script, which masks e-mails, phone
   numbers, bearer tokens, secret-named values and long tokens, and keeps the URL under GitHub's limit.
   Its source is [scripts/issue-url.md](scripts/issue-url.md) (a fenced code block, not a runnable file:
   the directory only accepts scripts from a Verified organization, which this plugin isn't yet). Write
   that block, unchanged, to `.afrotools/tools/issue-url.mjs` in the project (create `.afrotools/tools/`
   first if missing; overwrite the file if it already exists, so an older copy never runs), then:

   ```bash
   node .afrotools/tools/issue-url.mjs <<'EOF'
   <report as JSON>
   EOF
   ```

   It prints the cleaned `title`, `what_happened` and `steps`, then the link.

3. **Show the user** the cleaned text exactly as the script printed it (not your own summary) and the
   link. Tell them to read it, remove anything private the
   masking missed, tick the privacy box and submit it themselves.

4. **Never say the report was sent.** Only the user submits it; you have no way to know whether they did.
