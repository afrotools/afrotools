# Stack recipes

Read this file when [plan.md](plan.md) step 2, [build.md](build.md) step 1 or [ship.md](ship.md) step 3
sends you here, and only the part that phase names: "Default" and "What it means" for the plan, "On the
computer" for the build, "Going live" for the ship. The default recipe is for a user who is not a
developer, and for a developer who has no preference. A developer who names their own stack or host keeps
it: the rules in [rules.md](rules.md) and the checks do not change, and you fetch that host's documentation
for the keys, the domain, the backups and the way back, as [ship.md](ship.md) says.

Every fact below was read on the linked pages when this file was written. Pages change: before you give
the user a step, open the page linked next to it and use what it says today. Never state a price or a
free-tier limit from memory, and never state a fact about a bank, a card or a provider that no page gives.

## Default: Next.js on Vercel, a Neon database, Better Auth

| Part | Choice | Why, in one line |
|---|---|---|
| Framework | Next.js (latest, App Router, TypeScript) | one project for the pages and the server side (payment status, webhooks) |
| Hosting | [Vercel](https://vercel.com/docs) | managed: nothing to administer, HTTPS included, a way back to the previous version in one click |
| Database | [Neon](https://neon.com/docs) Postgres, created from inside Vercel | managed by Neon, one account and one bill with the host, a copy of the database for the computer |
| Data access | [drizzle](https://orm.drizzle.team/docs/overview) with versioned migrations | the tables are described in code and every change to them is a file in git |
| Interface | [Tailwind CSS](https://tailwindcss.com/docs) v4 (already in create-next-app's defaults) and [shadcn/ui](https://ui.shadcn.com/docs), one component at a time | the design direction becomes theme tokens the whole app uses; small CSS for slow connections; accessible dialogs, selects and forms copied into the project, not a dependency |
| Login | [Better Auth](https://www.better-auth.com/docs) | runs inside the app, the users' data stays in the app's database, no extra account; its one-time codes by SMS can go through a provider of the Afro.tools registry |
| Files | [Vercel Blob](https://vercel.com/docs/vercel-blob), only if the plan needs photos or documents | same account as the host, private or public store |

### What it means for the user (`level: explain`)

Say it in their words, two or three sentences: the app opens in the phone's browser, nothing to install;
Vercel keeps it running and Neon keeps the data, with a history to go back to; they create one account,
at Vercel (the database is created from there and billed with it); the code stays on their computer, with
its save points, unless they want a copy online (GitHub, see "Going live").

**Cost, in shape, never in figures.** Vercel's free plan (Hobby) is for non-commercial personal use only:
its [fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) count "any
method of requesting or processing payment from visitors of the site" and "advertising the sale of a
product or service" as commercial usage, which "requires either a Pro or Enterprise plan". An app that
takes payments or sells something therefore runs on the Pro plan, paid monthly, plus the database's plan
chosen inside Vercel. Send the user to [vercel.com/pricing](https://vercel.com/pricing) and to the
[Neon page on the Vercel Marketplace](https://vercel.com/marketplace/neon) for the amounts, and say that the
plan can start low and change later.

**How it is paid.** The [Hobby plan page](https://vercel.com/docs/plans/hobby) shows prices in US dollars
and an upgrade that asks for card details. So ask the user, in the plan phase, whether they have a card
that pays online abroad; if they are not sure, they ask their bank or their mobile money wallet whether it
offers one (some do, in some countries: you do not know which, and you say nothing about any of them).
The host's billing page says which cards it takes. If no such card can be found, say so now: a
non-developer then gets a managed host they can pay locally, chosen with them and with its documentation
fetched as [ship.md](ship.md) says; a developer may prefer their own server (below). The rest of Studio
does not change.

### Region

Vercel runs functions in Washington (`iad1`) by default. Put them in Frankfurt (`fra1`) and create the
Neon database in Frankfurt too (`aws-eu-central-1`): Vercel's
[regions page](https://vercel.com/docs/regions) says functions "should be executed in the same region as
your database", and Neon has no region in Africa (its [regions](https://neon.com/docs/introduction/regions)
in Europe are Frankfurt and London), so the two stay together in Europe. Set the region in code so it is
never forgotten: a `vercel.json` at the project root with `{ "regions": ["fra1"] }`
([configuring regions](https://vercel.com/docs/functions/configuring-functions/region)).

### On the computer (build phase, before the first feature)

1. **The account and the database come first**, because every screen needs data. The user creates
   themselves, with the links: a [Vercel account](https://vercel.com/signup); then the Neon database from
   the [Neon integration on the Vercel Marketplace](https://vercel.com/marketplace/neon) (**Install**,
   region Frankfurt, a plan they pick; the steps are on
   [Neon's page about it](https://neon.com/docs/guides/vercel-managed-integration)). In the Neon console
   (opened from Vercel's **Storage** tab), they create a branch named `dev`: a Neon branch is "a
   copy-on-write clone of your data", so the computer works on a copy and production keeps its own data.
   They copy the `dev` branch's **direct** connection string (connection pooling off in Neon's connect
   dialog; [connect from any app](https://neon.com/docs/connect/connect-from-any-app)) into `.env`
   themselves as `DATABASE_URL`: it holds a password, so never in the chat, and you never read `.env`
   (see step 5). A developer who has Postgres or Docker on the computer may use a local Postgres instead;
   production stays on Neon.
2. **The project**: `npx create-next-app@latest <name> --yes --ts --app --src-dir` (the `--yes` flag
   answers the prompts with the defaults, so the command never waits;
   [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app)); the code lives
   under `src/`, and Tailwind CSS is set up by those defaults.
   - **The direction becomes tokens.** Write the colours, text sizes and spacing of `docs/design.md` (or
     Impeccable's `DESIGN.md`) as theme variables in `globals.css`, in an `@theme` block
     ([Tailwind theme](https://tailwindcss.com/docs/theme): a `--color-*` variable gives `bg-*`, `text-*`
     and the other utilities). Screens use the tokens, never a raw colour or size: the preview is
     respected by construction, and a change of direction is one file.
   - **shadcn/ui** ("accessible components and a code distribution platform": "not a component library",
     the code is copied into the project): `npx shadcn@latest init` once
     ([install with Next.js](https://ui.shadcn.com/docs/installation/next); it supports Tailwind v4 and
     reads the tokens of `globals.css`), then `npx shadcn@latest add <component>` only when a screen needs
     one. Take it for what the agent gets wrong on its own: dialog, sheet, select, dropdown menu, toast,
     form fields; never the whole catalogue. Icons come with it (lucide).
   - **Fonts** through `next/font` ([fonts](https://nextjs.org/docs/app/getting-started/fonts)): a Google
     font is served "from the same domain as your deployment, meaning no requests are sent to Google by
     the browser", which matters on a slow connection paid by the megabyte. One font, variable if it exists.
   - **Forms** are native `<form>` with server actions and the validation on the server (zod); no form
     library by default.
3. **drizzle** with the `pg` driver: `drizzle-orm` and `pg`, `drizzle-kit` and `@types/pg` as dev
   dependencies, `import { drizzle } from "drizzle-orm/node-postgres"`
   ([get started](https://orm.drizzle.team/docs/get-started-postgresql)). It is the one driver that works
   on Neon, on a local Postgres and on a server, and it supports the transactions rules 1 and 2 need (mark
   paid after comparing the amount; fulfil once on a duplicate webhook). Tables in `src/db/schema.ts`.
   Every change to them: `drizzle-kit generate` (a SQL file in `drizzle/`, committed) then `drizzle-kit
   migrate` ([migrations](https://orm.drizzle.team/docs/migrations)). Never `drizzle-kit push` against
   production: it applies a diff with no history. Neon says to run schema migrations on a direct
   connection ([connection pooling](https://neon.com/docs/connect/connection-pooling)): the drizzle config
   reads `DATABASE_URL_UNPOOLED` when it is set (Vercel sets it in production), else `DATABASE_URL` (the
   direct string on the computer); the app itself uses `DATABASE_URL`. The `build` script runs
   `drizzle-kit migrate` before `next build`, so a deploy applies the pending migrations to the database
   it is connected to. Migrations only add: never drop or rename a column in the same release as the code
   that stops using it, remove it in a later one, because putting the previous version of the app back
   does not put the previous shape of the data back.
4. **Better Auth** with the [drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle)
   (`provider: "pg"`); the auth tables are generated with Better Auth's CLI as that page shows, then go
   through `drizzle-kit generate` like the others. Route handler
   `src/app/api/auth/[...all]/route.ts` ([Next.js integration](https://www.better-auth.com/docs/integrations/next)).
   Env: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (the app's address).
   - The owner and the people they name log in with
     [email and password](https://www.better-auth.com/docs/authentication/email-password) (`emailAndPassword:
     { enabled: true }`). Enabling it opens a sign-up route, page or no page: close it with a
     [database hook](https://www.better-auth.com/docs/concepts/database#database-hooks) on
     `user.create.before` that lets the first account through (the owner's, created right after the first
     deploy, before the app is announced) and refuses every other one unless the request comes from the
     logged-in owner, who creates the staff's accounts from inside the app.
   - Customers log in by phone only if the plan needs it, with the
     [phone number plugin](https://www.better-auth.com/docs/plugins/phone-number): its `sendOTP({ phoneNumber,
     code })` sends nothing by itself; implement it through the `communications` skill with the SMS
     provider recorded in `.afrotools/studio.md`, so the code travels on a provider the user chose. Its
     defaults (6 digits, 300 s, 3 attempts) are fine. Normalize every number to one international form
     (`+` and the country code, digits only) before Better Auth stores it and before counting it: otherwise
     `+221…`, `00221…` and `77…` are three numbers to the counter.
   - **Rule 4, two counts.** Better Auth's [rate limiter](https://www.better-auth.com/docs/concepts/rate-limit)
     keeps its counts in memory by default and is off in development: set `rateLimit: { enabled: true,
     storage: "database", customRules: { "/phone-number/send-otp": { window: 3600, max: 3 },
     "/sign-in/email": { window: 3600, max: 10 } } }` (`window` in seconds), then regenerate the tables (a
     `rateLimit` table). That limiter counts per caller's address (`X-Forwarded-For` by default), not per
     phone number: in `sendOTP`, before sending, count in a table of your own the codes sent to that
     number in the last hour and send nothing above three. Both counts are in the database, as rule 4
     asks, and `check` looks for both.
5. **Secrets and `.env`.** You never read `.env`, and never edit it with your file tool (editing means
   reading it first, and reading puts the user's keys in the chat). To generate `BETTER_AUTH_SECRET`,
   append it in one shell command whose output is never shown:
   `printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -base64 32)" >> .env`. create-next-app's
   `.gitignore` ignores `.env*`, which also ignores `.env.example`: add a `!.env.example` line, and keep
   `.env.example` with the names only. The app says which mode it runs in (sandbox or production), from
   one variable, as rule 3 asks.
6. **Files**, only if the plan has photos or documents: a Vercel Blob store the user creates in the
   dashboard, in Frankfurt, **private** for anything about a person (a customer's photo or document, read
   through the app once logged in), **public** for what anyone may see (product photos). On the computer,
   the user puts the store's read-write token in `.env` themselves; on Vercel, the connected project
   authenticates by itself ([Vercel Blob](https://vercel.com/docs/vercel-blob)).

### Going live (ship phase, with [ship.md](ship.md))

The user does every step that touches an account; you give the steps, with the page they come from,
re-read now. Two ways to get the code to Vercel:

- **`level: explain`: the Vercel CLI, from the computer.** No other account. The user logs in once:
  `npx vercel login`, typed in a terminal (in Claude Code, `! npx vercel login` runs it from the prompt),
  finished in the browser ([vercel login](https://vercel.com/docs/cli/login)). Then you create the
  project without deploying: `npx vercel link --yes` ("skip questions you are asked when setting up a new
  Vercel Project"; [vercel link](https://vercel.com/docs/cli/link)). Deploying is `npx vercel --prod`
  ([vercel deploy](https://vercel.com/docs/cli/deploy)), run only at step 6 and only on their go; every
  later change goes live the same way, through Studio. A change they want to try before production is
  `npx vercel` without `--prod`: a preview address.
- **`level: quiet`: GitHub.** The developer creates a repository and pushes (their own credentials); on
  Vercel, **New Project** imports it, and from then on Vercel deploys "on every branch push and merges
  onto the production branch" ([Git on Vercel](https://vercel.com/docs/git)), with a preview address per
  branch. Offer it to a non-developer only as an option, for a copy of the code outside the computer: it
  needs a GitHub account and a login on the computer (`gh auth login` or GitHub Desktop) that only they
  can do. Whatever the way, you push only after they say yes to this step ([build.md](build.md): never
  push to a remote unless they ask).

Then, in order:

1. **The database joins the project**: the Vercel project exists now (linked or imported). In its
   **Storage** tab the user connects the Neon database created in the build phase; with GitHub, they tick
   **Create database branch for deployment: Preview**, so every preview deployment gets its own copy of
   the data (`preview/<git-branch>`) and production keeps the `main` branch. The integration adds
   `DATABASE_URL`, `DATABASE_URL_UNPOOLED` and the `PG*` variables itself.
2. **The plan**: an app that sells or takes payments is commercial usage, so the user upgrades to Pro
   ([Hobby plan](https://vercel.com/docs/plans/hobby), **Settings → Billing**) and pays with their card
   (see "How it is paid").
3. **The production variables**, in **Settings → Environment Variables**, environment **Production**
   only, type **Secret** ([environment variables](https://vercel.com/docs/environment-variables)): the
   providers' production keys, `BETTER_AUTH_URL` (the app's address) and a new `BETTER_AUTH_SECRET` for
   production: generate it with `openssl rand -base64 32 > .env.production.local` (ignored by git,
   nothing shown), tell the user to open that file, paste its line into Vercel and say when it is done,
   then delete the file. Sandbox keys go to **Preview** and **Development**, never to Production.
   Changes apply to the next deployment only.
4. **The webhook address** each provider needs is `https://<the app's domain>/api/webhooks/<provider>`;
   the user registers it with the provider, as [ship.md](ship.md) step 3 says.
5. **Own domain, optional** ([add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)):
   **Settings → Domains → Add Domain**; the dashboard shows the record to set at the registrar (an **A**
   record for an apex domain, a **CNAME** for a subdomain). It can come later.
6. **Backups and the way back**, before the go. Nothing to turn on, two things to know: Neon's
   [instant restore](https://neon.com/docs/introduction/branch-restore) (**Backup & Restore → Restore from
   history**) brings the data back to a chosen moment within a history window that depends on the plan,
   short on the lowest plan: read it on the [plans page](https://neon.com/docs/introduction/plans) and tell
   the user; Vercel's [Instant Rollback](https://vercel.com/docs/instant-rollback) (production deployment
   tile) puts a previous version of the app back, on Hobby only the one before, on Pro any deployment that
   was in production. Say both in their words: "if a change breaks the app, we put the previous version
   back in one click; if data is damaged, Neon brings it back to a moment within the last <window>".
7. Then [ship.md](ship.md) step 4: the user's explicit go, the deploy (`npx vercel --prod`, or the push),
   the owner's account created first, and the manual tests in production.

## Developer path: your own server

For a developer at `level: quiet` who asks for it. Studio does not pick the provider: the user names a
VPS host they can pay (some hosts take local payment methods in some countries: the host's payment page
says, never your memory). The recipe:

- Docker Compose on the server: the app's image, Postgres with a named volume, a reverse proxy that
  obtains HTTPS certificates (Traefik or Caddy); the app runs as a non-root user; only ports 80 and 443
  open, SSH by key.
- Deploy by building the image in CI (GitHub Actions) and pulling it on the server; the previous image
  tag is the way back. `drizzle-kit migrate` runs on the server when the container starts, never during
  the image build (CI has no business holding the production database's address).
- Backups: a nightly `pg_dump` copied **off** the server (another provider's object storage), tested
  once by restoring it; say where it is and how to restore.
- Same rules, same checks, same Better Auth setup (`rateLimit.storage: "database"`); the webhook
  address is the server's domain.

Say what the user takes on: the server's updates and its security are theirs, nobody else restarts it.
