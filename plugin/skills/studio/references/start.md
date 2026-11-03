# Phase: start

Goal: the user knows what the app will do, which African providers it uses, and which keys to get.

1. **Say what Studio does for them**, in one sentence about the result, not the tools. For example:
   "I'll build your app with you, and connect payment and messages without the usual errors."
   Skip it if you already said it when Studio started on its own.
2. **Understand the idea in their words**: what the app does, for whom, in which country. At most
   three questions, only about what the user has not said. Then always, even when their first message
   said everything, play the idea back in two or three lines with their own words ("If I understand
   correctly: …", in their language) and ask one question: "Is that right?". Correct it until they say
   yes; propose providers only after that. A misunderstanding here costs everything that follows.
3. **List the African building blocks it needs**: receiving payments (mobile money, cards), paying out,
   SMS, WhatsApp, one-time codes (OTP)… Name each in plain words.
   Then always ask, whatever the blocks, whether they have a registered business or a merchant account
   (an informal workshop may have neither): some payment and messaging providers only open accounts for
   registered businesses.
4. **Find providers in the registry**, for each block and the user's country:
   `afrotools.search_specs({ category: "payment" | "communications" | …, country_code: "<ISO alpha-2>" })`.
   Never rely on memory: the registry changes. Present at most three options per block in plain words
   (what it covers, whether it was tested against the real API: `verified`, whether it has a test
   mode), recommend one with one reason, and let the user choose.
   Prefer a provider with a sandbox (`sandbox` in `afrotools.get_spec()`): the same provider then serves
   for the tests and for production, and the user tries everything without real money or real
   messages. Recommend one without a sandbox only when no provider covering the need has one, and say
   that every test will then be real.
   If the chosen spec is not `verified` (`ready`), say so, and plan to ask the user, once their test
   worked, for the report that makes it `verified`: the "After the integration" section of the
   `payment` or `communications` skill (`afrotools.report_integration`).
   **If no provider in the registry covers the block**, say so and let the user choose:
   - **wait for the registry**: the app goes on without this block for now;
   - **a provider outside the registry**, only if one covers the need in their country (check its
     documentation, not your memory): say clearly that it has no afro.tools spec, so its code is written
     from its own documentation, without the gotchas the registry records and without a tested status.

   Either way, offer to ask the registry for it, and let the user pick how:
   `afrotools.request_spec({ capability, provider, country_code, follow_up })`. `provider` only if one
   is named; without one, give the country (ISO alpha-2), for example USSD in Senegal:
   `{ capability: "ussd", country_code: "SN" }`.
   - anonymous (`follow_up: "none"`, the default): the request is recorded, and they will not be told
     what happens next;
   - with a GitHub issue to follow it (`follow_up: "github_issue"`): the result's `issue_url` is a
     pre-filled link they open and submit themselves; nothing about them is kept. Paste the whole link.

   `count`, when present, is how many times this need was requested in all: never "you are the Nth
   person". If `logged` is false, say the request was not recorded and give its `reason`. Record the
   need in `.afrotools/studio.md` as `pending: <need> (<provider or country>)`, adding
   `, for now: <provider> (outside the registry)` if one stands in.
5. **Explain how to get access**, for each chosen provider, only from what the registry gives:
   - its documentation: `docs_url` from `afrotools.list_providers()`. If `docs_public` is false or the
     link is empty, say the documentation is not public and the user has to contact the provider;
   - whether a test environment exists: `sandbox` and `environments` in `afrotools.get_spec()` for one of
     its capabilities. With a sandbox, the user starts there; real money comes later;
   - which keys the app will need: `auth.credentials` (or `auth.env_var`) in that spec, as the names of
     the environment variables to fill;
   - production access: a provider may review the account or ask for documents before real payments
     or messages, and the registry does not say what or how long. Suggest asking the provider now how
     to get production access, so it is ready when the app is; meanwhile the tests go on in the
     sandbox, when there is one;
   - who can open an account: the registry does not say yet whether a provider accepts an individual
     or requires a registered business. Tell the user to check this with the provider before signing
     up, for every provider (payment, SMS, WhatsApp…), all the more if they have no registered business.
     Never state a requirement the registry does not give.

   Tell the user to put the keys in a `.env` file at the project root themselves, and never to paste
   them in the chat. Do not describe sign-up steps, documents or delays the registry does not give.
6. **Record** the providers, the key names, whether there is a registered business or a merchant
   account, and, for each provider, whether production access was asked for in `.afrotools/studio.md`,
   set `phase: plan`, and say in one sentence what the next phase does.
