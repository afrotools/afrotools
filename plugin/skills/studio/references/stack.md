# Stack recipes

Read this file when [plan.md](plan.md) step 2, [build.md](build.md) step 1 or [ship.md](ship.md) step 3
sends you here. The default recipe is for a user who is not a developer, and for a developer who has no
preference. A developer who names their own stack or host keeps it: the rules in [rules.md](rules.md) and
the checks do not change, and you fetch that host's documentation for the keys, the domain, the backups
and the way back, as [ship.md](ship.md) says.

Every fact below was read on the providers' pages when this file was written. Pages change: before you
give the user a step, a price or a limit, open the page linked next to it and use what it says today.
Never state a price or a free-tier limit from memory.

## Default: Next.js on Vercel, a Neon database, Better Auth

| Part | Choice | Why, in one line |
|---|---|---|
| Framework | Next.js (latest, App Router, TypeScript), created with `npx create-next-app@latest` | one project for the pages and the server side (payment status, webhooks); the most common framework among African web developers |
| Hosting | [Vercel](https://vercel.com/docs) | managed: nothing to administer, HTTPS included, every change deploys itself, a way back in one click |
| Database | [Neon](https://neon.com/docs) Postgres, created from inside Vercel | managed and backed up by Neon, one account and one bill with the host, a copy of the database for the computer and for each preview |
| Data access | [drizzle](https://orm.drizzle.team/docs/overview) with versioned migrations | the tables are described in code and every change to them is a file in git |
| Login | [Better Auth](https://www.better-auth.com/docs) | runs inside the app, the users' data stays in the app's database, no extra account; its one-time codes by SMS can go through a provider of the Afro.tools registry |
| Files | [Vercel Blob](https://vercel.com/docs/vercel-blob), only if the plan needs photos or documents | same account as the host, private or public store |

### What it means for the user (`level: explain`)

Say it in their words, two or three sentences: the app opens in the phone's browser, nothing to install;
Vercel keeps it running and Neon keeps the data and its backups; they create one account at Vercel (the
database is created from there and billed with it), and one at GitHub so the code lives outside their
computer and every change goes live on its own.

**Cost, in shape, never in figures.** Vercel's free plan (Hobby) is for non-commercial personal use only:
its [fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage) count "any
method of requesting or processing payment from visitors of the site" and "advertising the sale of a
product or service" as commercial usage, which "requires either a Pro or Enterprise plan". An app that
takes payments or sells something therefore runs on the Pro plan, paid monthly, plus the database's plan
chosen inside Vercel. Send the user to [vercel.com/pricing](https://vercel.com/pricing) and to the
[Neon page on the Vercel Marketplace](https://vercel.com/marketplace/neon) for the amounts, and say that the
plan can start low and change later.

**How it is paid.** Vercel bills in US dollars, by card. Ask the user early (in the plan phase) whether
they have a card that pays online abroad. Possible ones, to check with their bank or wallet, never
asserted by you: a bank Visa or Mastercard with international payments enabled (in Nigeria, the bank may
have to enable them), a virtual card from a mobile money wallet or a neobank in the countries where one is
offered (Wave, Orange Money and Djamo offer one in some countries). The host's billing page says which
cards it takes. If no card can be found, say so now: the developer path below, or a host the user already
pays locally, replaces the default, and the rest of Studio does not change.

### Region

Vercel runs functions in Washington (`iad1`) by default. Put them in Frankfurt (`fra1`) and create the
Neon database in Frankfurt too (`aws-eu-central-1`): Vercel's
[regions page](https://vercel.com/docs/regions) says functions "should be executed in the same region as
your database". Neon has no region in Africa (its [regions](https://neon.com/docs/introduction/regions)
in Europe are Frankfurt and London), and for West and Central Africa the round trip to Europe is shorter
than to Cape Town; for Southern Africa the database still has to be in Europe, so keep both there.
Set the region in code so it is never forgotten: a `vercel.json` at the project root with
`{ "regions": ["fra1"] }` ([configuring regions](https://vercel.com/docs/functions/configuring-functions/region)).

### On the computer (build phase, before the first feature)

1. **The accounts and the database come first**, because every screen needs data. The user creates
   themselves, with the links: a [Vercel account](https://vercel.com/signup); then the Neon database from
   the [Neon integration on the Vercel Marketplace](https://vercel.com/marketplace/neon) (**Install**,
   region Frankfurt, a plan they pick; the steps are on
   [Neon's page about it](https://neon.com/docs/guides/vercel-managed-integration)). In the Neon console
   (opened from Vercel's **Storage** tab), they create a branch named `dev`: a Neon branch is "a
   copy-on-write clone of your data", so the computer works on a copy and production keeps its own data.
   They copy the `dev` branch's connection string into `.env` themselves as `DATABASE_URL` (it holds a
   password: never in the chat). A developer who has Postgres or Docker on the computer may use a local
   Postgres instead; production stays on Neon.
2. **drizzle**: `drizzle-orm` and `@neondatabase/serverless` (`drizzle-orm/neon-http`), `drizzle-kit` as a
   dev dependency ([connect to Neon](https://orm.drizzle.team/docs/connect-neon)). Tables in
   `src/db/schema.ts`. Every change to them: `drizzle-kit generate` (a SQL file in `drizzle/`, committed)
   then `drizzle-kit migrate` ([migrations](https://orm.drizzle.team/docs/migrations)). Never `drizzle-kit
   push` against production: it applies a diff with no history. Neon says to use a direct connection for
   schema migrations ([connection pooling](https://neon.com/docs/connect/connection-pooling)): the drizzle
   config reads `DATABASE_URL_UNPOOLED` when it is set, else `DATABASE_URL`; the app itself uses the
   pooled `DATABASE_URL`. The `build` script runs `drizzle-kit migrate` before `next build`, so a deploy
   applies the pending migrations to the database it is connected to.
3. **Better Auth** with the [drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle)
   (`provider: "pg"`); the auth tables are generated with Better Auth's CLI as that page shows, then go
   through `drizzle-kit generate` like the others. Route handler
   `app/api/auth/[...all]/route.ts` ([Next.js integration](https://www.better-auth.com/docs/integrations/next)).
   Env: `BETTER_AUTH_SECRET` (you generate it and write it into `.env` with your file tool, never printed)
   and `BETTER_AUTH_URL`.
   - The owner and the people they name log in with
     [email and password](https://www.better-auth.com/docs/authentication/email-password) (`emailAndPassword:
     { enabled: true }`); nobody else can sign up: no public sign-up page unless the plan has one.
   - Customers log in by phone only if the plan needs it, with the
     [phone number plugin](https://www.better-auth.com/docs/plugins/phone-number): its `sendOTP({ phoneNumber,
     code })` sends nothing by itself; implement it through the `communications` skill with the SMS
     provider recorded in `.afrotools/studio.md`, so the code travels on a provider the user chose. Its
     defaults (6 digits, 300 s, 3 attempts) are fine.
   - **Rule 4, two counts.** Better Auth's [rate limiter](https://www.better-auth.com/docs/concepts/rate-limit)
     keeps its counts in memory by default and is off in development: set `rateLimit: { enabled: true,
     storage: "database", customRules: { "/phone-number/send-otp": …, "/sign-in/email": … } }` with a
     window of an hour, then regenerate the tables (a `rateLimit` table). That limiter counts per caller's
     address (`X-Forwarded-For` by default), not per phone number: in `sendOTP`, before sending, count in
     a table of your own the codes sent to that number in the last hour and send nothing above three.
     Both counts are in the database, as rule 4 asks, and `check` reads them.
4. **Files**, only if the plan has photos or documents: a Vercel Blob store the user creates in the
   dashboard, in Frankfurt, **private** for anything about a person (a customer's photo or document, read
   through the app once logged in), **public** for what anyone may see (product photos). On the computer,
   the user puts the store's read-write token in `.env` themselves; on Vercel, the connected project
   authenticates by itself ([Vercel Blob](https://vercel.com/docs/vercel-blob)).
5. **`.env` is ignored by git; `.env.example` lists the names only.** The app says which mode it runs in
   (sandbox or production), from one variable, as rule 3 asks.

### Going live (ship phase, with [ship.md](ship.md))

The user does every step that touches an account; you give the steps, with the page they come from,
re-read now. Expected order:

1. **The code leaves the computer**: the user creates a [GitHub account](https://github.com/signup) and an
   empty private repository ([github.com/new](https://github.com/new)); with their go, you add it as the
   remote and push. Vercel deploys "on every branch push and merges onto the production branch"
   ([Git on Vercel](https://vercel.com/docs/git)): a change goes live by pushing `main`. If they refuse a
   GitHub account, the fallback is the Vercel CLI (`npx vercel`), after they log in themselves
   ([CLI deploy](https://vercel.com/docs/cli/deploy)); they lose the automatic deploys and the code's
   copy outside the computer: say so.
2. **The Vercel project**: **New Project**, import the repository (Next.js is detected). The database was
   created in the build phase: connect it to the project from the **Storage** tab, with **Create database
   branch for deployment: Preview** ticked, so every preview deployment gets its own copy of the data
   (`preview/<git-branch>`) and production keeps the `main` branch. The integration adds `DATABASE_URL`,
   `DATABASE_URL_UNPOOLED` and the `PG*` variables itself. If the first deployment ran before the database
   was connected, it fails for want of it: expected, redeploy after this step.
3. **The plan**: an app that sells or takes payments is commercial usage, so the user upgrades to Pro
   ([Hobby plan](https://vercel.com/docs/plans/hobby), **Settings → Billing**) and pays with their card
   (see "How it is paid").
4. **The production variables**, in **Settings → Environment Variables**, environment **Production**
   only, type **Secret** ([environment variables](https://vercel.com/docs/environment-variables)): the
   providers' production keys, `BETTER_AUTH_SECRET` (a new one for production: you generate it into
   `.env.production.local`, ignored by git, and the user copies it from there), `BETTER_AUTH_URL` (the
   app's address). Sandbox keys go to **Preview** and **Development**, never to Production. Changes
   apply to the next deployment only: redeploy after.
5. **The webhook address** each provider needs is `https://<the app's domain>/api/webhooks/<provider>`;
   the user registers it with the provider, as [ship.md](ship.md) step 3 says.
6. **Own domain, optional** ([add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)):
   **Settings → Domains → Add Domain**; an apex domain takes an **A** record, a subdomain a **CNAME**,
   both set at the registrar; the dashboard shows the values. It can come later.
7. **Backups and the way back**, before the go: Neon's
   [instant restore](https://neon.com/docs/introduction/branch-restore) (**Backup & Restore → Restore from
   history**, within a history window that depends on the plan: the
   [plans page](https://neon.com/docs/introduction/plans) gives it) and Vercel's
   [Instant Rollback](https://vercel.com/docs/instant-rollback) (production deployment tile; on Hobby only
   the previous deployment, on Pro any production deployment). Tell the user where both are, in their
   words: "if a change breaks the app, we put the previous version back in one click; if data is damaged,
   Neon brings it back to a chosen moment".
8. Then [ship.md](ship.md) step 4: the user's explicit go, and the manual tests in production.

## Developer path: your own server

For a developer at `level: quiet` who asks for it, or when no card for a foreign host can be found. Studio
does not pick the provider: the user names a VPS host they can pay (some hosts take local payment methods
in some countries: check the host's payment page, never from memory). The recipe:

- Docker Compose on the server: the app's image, Postgres with a named volume, a reverse proxy that
  obtains HTTPS certificates (Traefik or Caddy); the app runs as a non-root user; only ports 80 and 443
  open, SSH by key.
- Deploy by building the image in CI (GitHub Actions) and pulling it on the server; the previous image
  tag is the way back. Migrations run on deploy, as above.
- Backups: a nightly `pg_dump` copied **off** the server (another provider's object storage), tested
  once by restoring it; say where it is and how to restore.
- Same rules, same checks, same Better Auth setup (`rateLimit.storage: "database"`); the webhook
  address is the server's domain.

Say what the user takes on: the server's updates and its security are theirs, nobody else restarts it.
