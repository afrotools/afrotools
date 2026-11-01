# Third-party notices

afro.tools Studio ships reference files copied from the projects below, under their original
licenses. Each copied file starts with a line naming its source, its license and what was changed.

| Project | Commit | License | Files in `plugin/skills/studio/references/vendor/` |
|---|---|---|---|
| [phuryn/pm-skills](https://github.com/phuryn/pm-skills) | `07b34f64ee82` | MIT — `licenses/pm-skills.MIT.txt` | `create-prd.md` |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `eb07f19f52c2` | MIT — `licenses/agent-skills.MIT.txt` | `security-and-hardening.md`, `code-review-and-quality.md`, `shipping-and-launch.md` |
| [hookdeck/webhook-skills](https://github.com/hookdeck/webhook-skills) | `c764bd146110` | MIT — `licenses/webhook-skills.MIT.txt` | `webhook-handler-patterns.md`, `whatsapp-webhooks.md` |
| [anthropics/skills](https://github.com/anthropics/skills) | `ca45fc496a34` | Apache-2.0 — `licenses/anthropic-webapp-testing.Apache-2.0.txt` | `webapp-testing.md` |

## Changes

All copied files: the YAML frontmatter became a one-line note, because these are reference files that
Studio loads, not skills of their own; links relative to the original repository now point to it at
the pinned commit.

- `code-review-and-quality.md`: the "every change gets reviewed — no exceptions" rule is a strong
  recommendation the user can decline.
- `webapp-testing.md` (Apache-2.0): Python Playwright and the `with_server.py` helper are replaced by
  Node Playwright and the project's own dev server command; the bundled scripts and examples are not
  copied.
