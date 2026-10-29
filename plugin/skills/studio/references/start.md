# Phase: start

Goal: the user knows what the app will do, which African providers it uses, and which keys to get.

1. **Say what Studio does for them**, in one sentence about the result, not the tools. For example:
   "I'll build your app with you, and connect payment and messages without the usual errors."
2. **Understand the idea in their words**: what the app does, for whom, in which country. At most
   three questions; skip any the user already answered.
3. **List the African building blocks it needs**: receiving payments (mobile money, cards), paying out,
   SMS, WhatsApp, one-time codes (OTP)… Name each in plain words.
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
   If no provider covers the block, call `afrotools.request_spec({ provider, capability })`, tell the
   user the need is logged, and agree on what to do without it.
5. **Explain how to get access**, for each chosen provider, only from what the registry gives:
   - its documentation: `docs_url` from `afrotools.list_providers()`. If `docs_public` is false or the
     link is empty, say the documentation is not public and the user has to contact the provider;
   - whether a test environment exists: `sandbox` and `environments` in `afrotools.get_spec()` for one of
     its capabilities. With a sandbox, the user starts there; real money comes later;
   - which keys the app will need: `auth.credentials` (or `auth.env_var`) in that spec, as the names of
     the environment variables to fill.

   Tell the user to put the keys in a `.env` file at the project root themselves, and never to paste
   them in the chat. Do not describe sign-up steps, documents or delays the registry does not give.
6. **Record** the providers and the key names in `.afrotools/studio.md`, set `phase: plan`, and say in
   one sentence what the next phase does.
