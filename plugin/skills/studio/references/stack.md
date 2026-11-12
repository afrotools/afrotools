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
| Interface | [Tailwind CSS](https://tailwindcss.com/docs) v4 (already in create-next-app's defaults) and [shadcn/ui](https://ui.shadcn.com/docs), one component at a time | the design direction becomes the theme every component uses; small CSS for slow connections; accessible dialogs, selects and sheets whose source is copied into the project |
| Login | [Better Auth](https://www.better-auth.com/docs) | runs inside the app, the users' data stays in the app's database, no extra account; its one-time codes by SMS can go through a provider of the Afro.tools registry |
| Files | [Vercel Blob](https://vercel.com/docs/vercel-blob), only if the plan needs photos or documents | same account as the host, private or public store |

### What it means for the user (`level: explain`)

Say it in their words, two or three sentences: the app opens in the phone's browser, nothing to install;
Vercel keeps it running and Neon keeps the data, with a history to go back to; they create one account,
at Vercel (the database is created from there and billed with it). The code stays on their computer with
its save points: without GitHub (see "Going live") this computer holds the only copy, so say once that it
must be backed up like any important file.

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

1. **The account and the database come first**, because every screen needs data. The user creates these
   themselves, with the links: a [Vercel account](https://vercel.com/signup); then the Neon database from
   the [Neon integration on the Vercel Marketplace](https://vercel.com/marketplace/neon) (**Install**,
   region Frankfurt, a plan they pick, the name the screen proposes; the steps are on
   [Neon's page about it](https://neon.com/docs/guides/vercel-managed-integration)). Say before they open
   it that the optional **Auth** ("Managed Better Auth") and **Realtime** stay unticked: the app runs its
   own Better Auth (step 4), Auth would only add profiles synced to Postgres and two variables the app
   never reads. In the Neon console
   (opened from Vercel's **Storage** tab), they create a branch named `dev`: a Neon branch is "a
   copy-on-write clone of your data", so the computer works on a copy and production keeps its own data.
   They copy the `dev` branch's **direct** connection string (connection pooling off in Neon's connect
   dialog; [connect from any app](https://neon.com/docs/connect/connect-from-any-app)) into `.env`
   themselves as `DATABASE_URL`: it holds a password, so never in the chat, and you never read `.env`
   (see step 5; `grep -q '^DATABASE_URL=' .env` tells you whether it is there without showing it). At
   `level: explain`, always the `dev` branch, even when a Postgres is installed on the computer: nothing
   to install or keep running, and [plan.md](plan.md) wants the same kind of database on the computer
   and in production, so the Neon steps are not left for the ship phase. A developer at `level: quiet`
   who asks for it may use a local Postgres instead; production stays on Neon.
2. **The project.** The folder already holds `.afrotools/`, `docs/` and `.env`, and create-next-app
   refuses a folder with files it does not know. So scaffold next to it, then move everything in:
   `npx create-next-app@latest ../<name>-scaffold --yes --ts --app --src-dir` (the `--yes` flag answers
   the prompts with the defaults, so the command never waits;
   [create-next-app](https://nextjs.org/docs/app/api-reference/cli/create-next-app)), move its contents,
   dotfiles included, into the project root (merge its `.gitignore` with an existing one), delete the
   scaffold folder. The app's `package.json` is at the project root, next to `.afrotools/`, and the code
   lives under `src/`. Tailwind CSS is set up by those defaults.
   - **shadcn/ui first, then the direction on top of it.** `npx shadcn@latest init -d` (its `--defaults`
     flag; [shadcn CLI](https://ui.shadcn.com/docs/cli)): it installs its dependencies, the `cn` helper and
     writes its own CSS variables (`--background`, `--primary`, `--destructive`, `--muted`, `--card`…) into
     `globals.css`, mapped to Tailwind through `@theme inline`. Then put the direction's values
     (`docs/design.md`, or Impeccable's `DESIGN.md`: its colours go into the same variables) into those
     variables in `:root`, and add a token of your own only for a name shadcn lacks
     ([Tailwind theme](https://tailwindcss.com/docs/theme): a `--color-*` variable gives `bg-*`, `text-*`
     and the other utilities). One palette: the components and the screens read the same variables,
     screens never use a raw colour or size, and a change of direction is one file.
   - Components come one at a time, `npx shadcn@latest add <component>`, only when a screen needs one,
     for what the agent gets wrong on its own: `button`, `input`, `label`, `select`, `dialog`, `sheet`,
     `dropdown-menu`, `sonner` (toasts). Not `form`: it wraps a form library, and forms here are native.
     Icons come with it (lucide).
   - **Fonts**: replace the default font with the direction's one through `next/font`
     ([fonts](https://nextjs.org/docs/app/getting-started/fonts)): a Google font is served "from the same
     domain as your deployment, meaning no requests are sent to Google by the browser", which matters on a
     slow connection paid by the megabyte. One font, variable if it exists.
   - **Forms** are native `<form>` with server actions and the validation on the server (zod), the errors
     returned to the field; no form library.
3. **drizzle** with the `pg` driver: `drizzle-orm` and `pg`, `drizzle-kit` and `@types/pg` as dev
   dependencies, `import { drizzle } from "drizzle-orm/node-postgres"`
   ([get started](https://orm.drizzle.team/docs/get-started-postgresql)). It works on Neon, on a local
   Postgres and on a server, and it supports the transactions rules 1 and 2 need (mark paid after
   comparing the amount; fulfil once on a duplicate webhook). Neon's connection string carries
   `sslmode=require`, which `pg` honours: no `ssl` setting by hand. Tables in `src/db/schema.ts`.
   Every change to them: `drizzle-kit generate` (a SQL file in `drizzle/`, committed) then `drizzle-kit
   migrate` ([migrations](https://orm.drizzle.team/docs/migrations)). Never `drizzle-kit push` against
   production: it applies a diff with no history. Neon says to run schema migrations on a direct
   connection ([connection pooling](https://neon.com/docs/connect/connection-pooling)): the drizzle config
   reads `DATABASE_URL_UNPOOLED` when it is set (Vercel sets it in production), else `DATABASE_URL` (the
   direct string on the computer); the app itself uses `DATABASE_URL`. The `build` script runs
   `drizzle-kit migrate` before `next build`, so a deploy applies the pending migrations to the database
   it is connected to (and `npm run build` on the computer migrates the `dev` branch). Migrations only
   add: never drop or rename a column in the same release as the code that stops using it, remove it in a
   later one, because putting the previous version of the app back does not put the previous shape of the
   data back.
4. **Better Auth** with the [drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle)
   (`provider: "pg"`); the auth tables are generated with Better Auth's CLI as that page shows, then go
   through `drizzle-kit generate` like the others. Route handler
   `src/app/api/auth/[...all]/route.ts` ([Next.js integration](https://www.better-auth.com/docs/integrations/next)).
   Env: `BETTER_AUTH_SECRET` (step 5) and, in production, `BETTER_AUTH_URL` (the app's address; on the
   computer it may stay unset: Better Auth then infers it from the request, which its
   [options page](https://www.better-auth.com/docs/reference/options) allows but does not recommend for
   production).
   - **The owner, then the people they name.** [Email and password](https://www.better-auth.com/docs/authentication/email-password)
     (`emailAndPassword: { enabled: true }`) opens a sign-up route, page or no page. Close it to strangers
     with a [database hook](https://www.better-auth.com/docs/concepts/database#database-hooks) on
     `user.create.before` scoped to that route (`ctx.path === "/sign-up/email"`; other routes, such as a
     customer's phone sign-up, are left alone): it lets the request through only while the user table is
     empty and the email is `OWNER_EMAIL` (an environment variable, not a secret: step 5), and gives that
     first account the `admin` role; afterwards it refuses. The app has a `/setup` page shown only while
     the user table is empty, where the owner creates their account: on the computer, you create a test
     owner there; in production, the owner does it right after the first deploy, before the app is
     announced. Staff accounts are created by the owner from inside the app with the
     [admin plugin](https://www.better-auth.com/docs/plugins/admin) (`auth.api.createUser`, "allows an
     admin to create a new user"), never by a public sign-up.
   - Customers log in by phone only if the plan needs it, with the
     [phone number plugin](https://www.better-auth.com/docs/plugins/phone-number): its `sendOTP({ phoneNumber,
     code })` sends nothing by itself; implement it through the `communications` skill with the SMS
     provider recorded in `.afrotools/studio.md`, so the code travels on a provider the user chose. Its
     defaults (6 digits, 300 s, 3 attempts) are fine. Normalize every number to one international form
     (`+` and the country code, digits only) before Better Auth stores it and before counting it: otherwise
     `+221…`, `00221…` and `77…` are three numbers to the counter.
   - **Rule 4, two counts, the per-number one is the real one.** In `sendOTP`, before sending, count in a
     table of your own the codes sent to that number in the last hour and send nothing above three. Better
     Auth's [rate limiter](https://www.better-auth.com/docs/concepts/rate-limit) counts per caller's
     address (`X-Forwarded-For` by default), and on mobile networks one address is shared by thousands of
     phones, so it is only a backstop against floods, set loose: `rateLimit: { enabled: true, storage:
     "database", customRules: { "/phone-number/send-otp": { window: 3600, max: 30 }, "/sign-in/email":
     { window: 3600, max: 30 } } }` (`window` in seconds; in memory by default and off in development,
     hence `storage` and `enabled`), then regenerate the tables (a `rateLimit` table). Both counts are in
     the database, as rule 4 asks, and `check` looks for both.
5. **Secrets and `.env`.** You never read `.env`, and never edit it with your file tool (editing means
   reading it first, and reading puts the user's keys in the chat). Not even to diagnose a provider's
   error (on the second end-to-end test, the agent put the key from `.env` in a shell variable to
   replay the call with `curl`, and the key ended up in its own output): the only commands that touch
   `.env` are the ones in this step and step 1's `grep -q`, none of which prints a value. A provider's
   error is read in the output of the dev server you started: the app logs the provider's status and
   response body, as [build.md](build.md) step 2 asks, and never anything it sent, headers, body or
   address, since some providers carry the key in the body or the URL (PayGate, Paycard); if the body
   echoes the request, the status alone; a webhook's headers are never logged either. Then it is
   reproduced through the app's own action, as build.md step 6 tests it. What you add to it goes through one
   shell command that shows nothing, guarded so a resume does not add it twice:
   `grep -q '^BETTER_AUTH_SECRET=' .env || printf 'BETTER_AUTH_SECRET=%s\n' "$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))")" >> .env`
   (Node is already there; `openssl` is not always, on Windows). Same form for `OWNER_EMAIL=<the email
   the user gave>`. create-next-app's `.gitignore` ignores `.env*`, which also ignores `.env.example`: add
   a `!.env.example` line, and keep `.env.example` with the names only. The app says which mode it runs
   in (sandbox or production), from one variable, as rule 3 asks.
6. **Files**, only if the plan has photos or documents: a Vercel Blob store the user creates in the
   dashboard, in Frankfurt, **private** for anything about a person (a customer's photo or document, read
   through the app once logged in), **public** for what anyone may see (product photos). On the computer,
   the user puts the store's read-write token in `.env` themselves; on Vercel, the connected project
   authenticates by itself ([Vercel Blob](https://vercel.com/docs/vercel-blob)).
7. **A public address for the computer, when a provider needs one.** A provider's confirmation
   (its webhook), its return page, and any link it sends the customer on the app's behalf all need a
   public `https` address, and the computer has none: on the second end-to-end test, Bictorys refused a
   `localhost` return address (its `create_charge` spec: the redirect addresses must start with
   `https://`, or the charge itself is refused), and the confirmation could only be seen through the
   "check the payment" button; on the third, a WhatsApp template's button — a link sent to the customer,
   not a webhook — pointed at the production address with no way to try the click-through before going
   live. So, when you wire a provider that has a webhook (a spec with `capability_type: "webhook"` among
   those `afrotools.search_specs()` returns for it; for a provider outside the registry, a webhook in its
   documentation) or whose capability sends the customer a link back to the app (a payment link, a link
   in a WhatsApp template, a link in an SMS message), put the dev server behind a tunnel with
   [ngrok](https://ngrok.com/docs/getting-started/), the same way for every such provider (payment,
   WhatsApp…; the Hookdeck tunnel named in [vendor/whatsapp-webhooks.md](vendor/whatsapp-webhooks.md) is
   not used, this one is) — before your own test of [build.md](build.md) step 6. Read the full
   `input_schema` before concluding a capability sends nothing back to the customer: the link can sit
   several levels down (Infobip's `send_whatsapp_template`, `capability_type: "synchronous"`, buries a
   `URL`-type template button under `content.templateData.buttons`). At
   `level: explain`, say it is a temporary public address for their computer, so the service can tell the
   app that a payment went through, or so the link it sends can be tried, while you test.
   - **Account and install.** If `ngrok` is not on the computer, offer it in one message, never the
     same message as the companions offer: what it is for (the temporary public address above), that it
     has a free plan ([free plan limits](https://ngrok.com/docs/pricing-limits/free-plan-limits/), read
     now), that it takes an account and one command to type once in their terminal, and what a no means
     for this provider (the last bullet: the confirmation seen through the button only, or, with a
     provider that refuses `http` return addresses, nothing tried before production); they decide, and
     the answer goes into `.afrotools/studio.md` as `tunnel: yes | no`; with `no`, do not offer again.
     With a yes, the user creates the free ngrok account themselves, and you install the agent yourself
     when `brew` is on the computer (`brew install ngrok`); otherwise send them to the download page the
     getting-started page links for Linux and Windows. Then they run, in their own terminal
     application, the one `ngrok config add-authtoken …` command their dashboard shows: it ties the
     program to their account, the only command a non-developer types during the build
     ([build.md](build.md) step 5), because it holds a secret, never in the chat; and you never read
     ngrok's configuration file. You see whether it is done when `ngrok http` starts, or refuses to for
     want of an authtoken.
   - **One tunnel per computer.** The free plan has one dev domain per account
     ([free plan limits](https://ngrok.com/docs/pricing-limits/free-plan-limits/)). Before starting,
     `GET http://127.0.0.1:4040/api/endpoints` ([agent API](https://ngrok.com/docs/agent/api/)): if
     something answers, a tunnel already runs on this computer, for this project or another; do not start
     a second one, say so. Otherwise start it yourself, in the background, on the dev server's port:
     `ngrok http <port>`. Every account, the free ones included, has a dev domain such as
     `<assigned-name>.ngrok-free.dev`, "static: it doesn't change when you restart the agent", and
     `ngrok http` "puts it on your dev domain automatically"
     ([domains](https://ngrok.com/docs/universal-gateway/domains/)), so the address a provider holds
     stays valid from one session to the next. Read it in `endpoints[0].url` of that same
     `GET /api/endpoints` (the public address; `upstream.url` is the computer's), never from
     `/api/requests/http`: it holds the captured requests, secrets of the provider's webhook included.
     ngrok is a process you started: stop it with the dev server at the end of the session.
   - **The dev server** must accept that hostname: `allowedDevOrigins: ["<the dev domain>"]` in
     `next.config.ts`, without scheme or port
     ([allowedDevOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins)):
     Next.js "blocks cross-origin requests to dev-only assets and endpoints during development by
     default". Restart the dev server after this and after the `.env` line below.
   - **The app's public address** is one variable, `APP_URL`: the links sent to customers and the return
     and webhook addresses given to a provider come from it, never from a literal, except a link
     approved in advance (the next bullet). On the computer it is
     the tunnel address, in production the site's (Going live, step 3). Write it to `.env` with the
     one-line form of step 5 (not a secret; if the line is already there with another address, rewrite
     it with a shell command that shows nothing, never by editing the file). `BETTER_AUTH_URL` stays
     unset on the computer and the owner keeps using `http://localhost:<port>`; a customer's test
     journey, when customers log in (step 4), starts on the tunnel address and stays there: a session
     opened on `localhost` does not exist on the dev domain.
   - **The webhook address**, `${APP_URL}/api/webhooks/<provider>`, reaches the provider one of two
     ways, and the webhook spec or the create capability's input says which: when the create capability
     takes it in its input (LengoPay's `callback_url`), the app sends it on every request and the user
     registers nothing; otherwise give the user the address to paste in the provider's **test**
     settings, and where those are, read now in the provider's documentation (`docs_url`), never from
     memory. At `level: explain`: "the address where <provider> tells your app that a payment went
     through; paste it in <where the documentation says>, in the test part". The secret the webhook spec
     asks for: when the provider gives it on registration, the user copies it into `.env` themselves
     ([build.md](build.md) step 3); when the merchant chooses it (Bictorys's `X-Secret-Key`), the user
     makes a long one with their password manager and pastes it in both places themselves, since they
     have to see it. If the account already serves another app, a provider may take only one webhook
     address per account or environment: say so and let the user decide; never tell them to replace an
     address this app did not register. In production the address is the site's (Going live, step 4).
   - **A link approved in advance (a WhatsApp template's button).** A dynamic URL button's domain is
     registered with Meta when the template is created: "you must still register the domain with Meta,
     but you can define placeholder parameters that are populated using the Infobip WhatsApp API when
     sending the message"
     ([Infobip: dynamic template button URLs](https://www.infobip.com/docs/whatsapp/whatsapp-over-api#dynamic-template-button-urls-with-shortening-and-tracking),
     read now for the provider at hand — a different provider's WhatsApp template capability may register
     the domain differently). Only the placeholder at the end of the URL (`{{n}}`) varies per message, so
     `APP_URL` cannot swap the domain per environment the way the app's own code does. No capability in
     this registry creates or submits a template; the user does it themselves, by hand, in the provider's
     console (Infobip's WhatsApp Manager, or Meta Business Manager). Before they submit one, say so and
     let them choose, at `level: explain`: "this button's link gets fixed in place when the template is
     approved; I can have you submit it with your test address so you can try the whole flow now, but it
     will need a second approval with the live address before it goes out to real customers — or you can
     submit it once with the live address and leave this one part untested until then. Which do you
     want?" Record the choice in `.afrotools/studio.md` as `template_domain: tunnel | production`; never
     pick it for them.
   - **The warning page.** On the free plan, ngrok shows a page "in front of all HTML browser traffic",
     with a **Visit** button, once per browser; it "does not impact users serving APIs or accessing
     ngrok endpoints programmatically", so the webhooks pass
     ([free plan limits](https://ngrok.com/docs/pricing-limits/free-plan-limits/), where the plan's
     quotas are: never state them from memory). Tell the user before their test: the first thing they
     see after paying, when the provider sends them back to the app, is that page, and one click on
     **Visit** ends it.
   - **Without the tunnel** (`tunnel: no`, or the install fails), the app still
     asks the provider for the status itself (rule 1, [build.md](build.md) step 7) and "check the
     payment" does the work, but the return page cannot show on the computer, and a provider that
     refuses an `http` return address (Bictorys) cannot be tried from the computer at all: say so; the
     whole journey is then first seen in production, with a small real payment. A link in a WhatsApp
     template or an SMS message stays on the production address too, and is first tried in production.

### Going live (ship phase, with [ship.md](ship.md))

The user does every step that touches an account; you give the steps, with the page they come from,
re-read now. Two ways to get the code to Vercel:

- **`level: explain`: the Vercel CLI, from the computer.** No other account. The user logs in once, in
  their own terminal application: `npx vercel login`, finished in the browser
  ([vercel login](https://vercel.com/docs/cli/login)); you check with `npx vercel whoami` (it prints a
  username, nothing secret). Then you create the project without deploying: `npx vercel link --yes`
  ("skip questions you are asked when setting up a new Vercel Project";
  [vercel link](https://vercel.com/docs/cli/link)). Before any `npx vercel`, preview included, write a
  `.vercelignore` at the project root with two lines, `.env` and `.env.*`: the CLI uploads the folder's
  files, and its [default ignore list](https://vercel.com/docs/builds/build-features#ignored-files-and-folders)
  skips `.env.local` and `.env.*.local`, not `.env` (on the first end-to-end test, the computer's `.env`
  went up with the first `vercel --prod` although `.gitignore` ignored it; the app refused to start in
  production with the sandbox variables, and the file is visible in that deployment's sources to the
  Vercel team). `npx vercel deploy --dry`, from the linked project, lists the files a deploy would include
  without creating one ([dry-run deployments](https://vercel.com/changelog/dry-run-deployments-with-vercel-cli),
  CLI 54.17.2 or later): run it once and check no `.env` is in the list. Deploying is `npx vercel --prod`
  ([vercel deploy](https://vercel.com/docs/cli/deploy)), run only at step 7 and only on their go; every
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
   **Storage** tab the user connects the Neon database created in the build phase (the tab takes a project
   linked by `vercel link --yes` and never deployed; if it asks for a deployment first, deploy once with
   `npx vercel`, without `--prod`). Its **Connect Project** screen asks three things, say them before the
   user opens it ([Neon's page](https://neon.com/docs/guides/vercel-managed-integration)):
   - the environments: all three, Development, Preview and Production;
   - **Create database branch for deployment**: tick **Preview**, never Production, on both paths. Every
     preview deployment then gets its own copy of the data and production keeps the `main` branch; without
     it a preview would run against production's data, with the sandbox keys of step 3 and the `build`
     script's migrations. Each branch counts against the plan's allowance, the `dev` branch too
     ([plans](https://neon.com/docs/introduction/plans));
   - the custom prefix: empty, unless the project already uses those variable names for something else.

   The integration adds `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, the `PG*` pieces and legacy `POSTGRES_*`
   variables itself: tell the user these extra names are expected, the app reads `DATABASE_URL` only.
2. **The plan**: an app that sells or takes payments is commercial usage, so the user upgrades to Pro
   ([Hobby plan](https://vercel.com/docs/plans/hobby), **Settings → Billing**) and pays with their card
   (see "How it is paid").
3. **The production variables** ([vercel env](https://vercel.com/docs/cli/env); in Production the type is
   Secret by default). A new secret for production, never the computer's, piped so it is neither shown nor
   kept in the shell history:
   `node -e "process.stdout.write(require('crypto').randomBytes(32).toString('base64'))" | npx vercel env add BETTER_AUTH_SECRET production`.
   The values that are not secret, with `--value`: `BETTER_AUTH_URL` and `APP_URL` (both the app's
   address, `https://…`; `APP_URL` replaces the computer's tunnel address of "On the computer" step 7)
   and `OWNER_EMAIL`, each `npx vercel env add <NAME> production --value "<value>" --no-sensitive --yes`.
   The providers' production keys the user enters themselves, in **Settings → Environment Variables**,
   environment **Production** only ([environment variables](https://vercel.com/docs/environment-variables));
   sandbox keys go to **Preview** and **Development**, never to Production. Changes apply to the next
   deployment only. A developer on the GitHub path does the same with the CLI once logged in, or in the
   dashboard.
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
   the owner's account created by the owner at `/setup` before anything else, and the manual tests in
   production.

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
