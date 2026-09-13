# specs/ — CLAUDE.md

See **[ATSS.md](../ATSS.md)** at the repo root for the full ATSS specification —
folder structure, `schema.json`/`provider.json` field rules, `canonical_example.ts`
rules, the status lifecycle, and the `verified` criteria.

This file used to hold its own copy of that content. It drifted out of sync within
weeks (old field layout, old status names, a stale provider table) and — because
Claude Code auto-loads the `CLAUDE.md` of whatever directory it's working in — every
agent working under `specs/` was silently handed the wrong rules. Don't recreate a
second copy here; point back to `ATSS.md` instead.
