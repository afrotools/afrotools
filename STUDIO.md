# Studio

This documents **afro.tools Studio** (`/afrotools:studio`) for a human reading the repo — what
it is, how it's structured, what state it keeps. It is not the agent's instructions: those live
in [`plugin/skills/studio/SKILL.md`](plugin/skills/studio/SKILL.md) and its `references/` files,
written for the agent to follow, not for a person to read linearly. If you're changing Studio,
read the skill file; read this one first to know where to look.

> **Terminology note:** same distinction as in [ATSS.md](./ATSS.md) — a "spec" is an ATSS API
> description, a "skill" is a `SKILL.md` instruction file. Studio is a skill; it builds apps
> that consume specs.

---

## What it is

Studio takes someone — developer or not — from an app idea to that app in production for an
African market: a short plan, a design, mobile money and SMS/WhatsApp wired from the Afro.tools
registry, and checks before going live. It offers itself when a user describes an app idea
instead of naming Studio or afro.tools, and always asks before starting.

## The five phases

Each phase is its own file under `plugin/skills/studio/references/`. The agent reads only the
current phase's file, not the others, every time the skill starts (including on resume).

| Phase | File | Ends when |
|---|---|---|
| start | `references/start.md` | the user knows which providers the app uses and which keys to get |
| plan | `references/plan.md` | a short plan is agreed, with the stack, the hosting and the database |
| design | `references/design.md` | the user chose a critiqued preview of the main screen |
| build | `references/build.md` | the app works locally with sandbox keys |
| ship | `references/ship.md` | the app is in production, with the user's explicit go |

After `ship`, the phase becomes `done`: the app is live, and a further request is a change to
it, routed back through `build` then `ship`. `references/stack.md` holds the default stack
recipe (Next.js on Vercel, Neon, Better Auth, Drizzle — see the file for the rest) that `plan`
proposes unless the user wants something else.

## State

Studio keeps where a user is in `.afrotools/studio.md` at the project root — plain text, read
first on every start so nothing already answered is asked twice:

```
level: explain | quiet
phase: start | plan | design | build | ship | done
superpowers_offered: true | false
impeccable_offered: true | false
impeccable_use: unasked | yes | no
polish_offered: true | false
playwright_offered: true | false
review_declined: 0 | 1 | 2
```

Below these lines: the decisions taken so far (providers, keys, stack, hosting, database), and
one `pending:` line per need the registry doesn't cover yet (checked again against
`search_specs` on every resume, so a provider that ships later gets picked up automatically).

`level` is asked once, up front: `explain` (non-developer — decide details, narrate what the
user will see and do, never a bare technical term) or `quiet` (developer — apply the rules
without narrating them, take a whole brief at once).

## The three companions

Offered once, in one message, each named by its real name even at `level: explain` (the
"no jargon" rule is about words inside the app, not about naming a tool the user says yes or no
to). Studio works without all three — it says so.

- **superpowers** — a step-by-step planning method. Skipped if a `superpowers:*` skill is
  already installed.
- **Impeccable** — designs the screens and critiques them before any code (without it, the
  design is clean but generic). Installs for every project on the machine, for several agents.
- **A browser Studio drives** (Playwright MCP) — checks every screen at a phone's width as the
  user will see it. Skipped if already configured.

## The rules

Six rules, in [`references/rules.md`](plugin/skills/studio/references/rules.md): payments
confirmed server-side with the amount compared (never copied), nothing paid or sent twice, no
key in the code/browser/chat, messages a stranger can trigger rate-limited per number and per
hour — these four are non-negotiable. A security audit and a code review before going live are
strongly advised, never forced: Studio says what each catches and roughly what it costs, and the
user decides.

## Commands Studio calls

Three manual commands exist because of Studio, and it calls them itself, but each also works
standalone on any Afro.tools-based app, Studio or not:

- `/afrotools:check` — Studio runs it before going live (`references/ship.md`); the category
  skills also offer it once a provider is wired, without Studio.
- `/afrotools:review [audit]` — Studio offers it, strongly advised, after each feature and
  before going live (`references/build.md`, `references/ship.md`).
- `/afrotools:diagnose` — offered whenever Studio, or any other skill, didn't behave as it
  should.

## Changing Studio

See [CONTRIBUTING.md § Contributing to the plugin](./CONTRIBUTING.md#contributing-to-the-plugin)
for how skills are laid out, the sourcing rule for `references/vendor/`, and how to verify a
change before opening a PR.
