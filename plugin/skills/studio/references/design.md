# Phase: design

Goal: the user has chosen how the app will look on their phone, and that choice has been critiqued,
before any screen is built. An agent designing alone tends to make screens that look generated: safe,
templated, dated. This phase is where that is prevented; fixing it after the build costs far more.

1. **Two tools, offered here once each**, in one message, because both need a new session to load:
   - **Impeccable**, a design specialist that designs the screens and critiques them. If no skill named
     `impeccable` is listed and `impeccable_offered` is not `true`, recommend it in two sentences: without
     it the design will be clean but generic. Say that it installs for every project on this computer,
     for several agents, and that it uses more tokens during this phase. With a yes, run
     `npx impeccable install` yourself. Set `impeccable_offered: true`, and `impeccable_use: yes` with a yes,
     `no` without: that answer is the user's say on using Impeccable in this phase.
   - **A browser you drive**, to see the screens as the user will: here to critique the preview, later to
     check every built screen. If browser tools (`mcp__playwright__*`, or
     `mcp__plugin_playwright_playwright__*` from the Playwright plugin) are not available and
     `playwright_offered` is not `true`, offer it: free, it uses the Chrome already installed. With a yes,
     run `claude mcp add playwright -- npx @playwright/mcp@latest --browser chrome --headless` (it is added
     to this project only). Set `playwright_offered: true`.

   Update the state file first. Then, if something was installed, tell the user to close and reopen their
   agent in this folder and type `/afrotools:studio` again: the state file keeps where they are.
2. **One question**, in plain words: a look they like (an app they use every day, their shop's colours,
   a logo). If they have none, choose from the business and its people.
3. **The bar**, whoever designs:
   - It must not look older or busier than the apps the user opens every day. Modern here means
     restraint: a calm neutral background, one accent colour for actions only, three or four text sizes,
     spacing from one scale (multiples of 4 px), aligned edges, room to breathe. The content (names,
     amounts, statuses) carries the screen, not decoration.
   - Local identity comes from the content, the language, the currency and at most one colour. No
     traditional pattern (wax, kente, bogolan…) as decoration unless the user asks for it.
   - No purple-blue gradients, no glowing cards, no emoji as icons, no cards inside cards, no stock
     "hero" banner: the screen starts with what the user came to do.
   - Usable where it will be used: text contrast at least 4.5:1; phone first: one column, tap targets at
     least 44 px, the main action reachable with the thumb, forms with the right keyboard
     (`inputmode="numeric"` for amounts and phone numbers); weak connection: no heavy images or video, at
     most one web font, pages that say clearly when something is loading or failed, and that keep what was
     typed; states designed, not left to chance: empty lists, errors, payment pending, payment failed,
     test mode.
4. **Two directions to choose from.** Make two previews of the main screen, each a single static page,
   different enough to be a real choice, not two shades of one design: `docs/preview-a.html` and
   `docs/preview-b.html`, with real content in the user's language (real-looking names, prices in the
   local currency, dates).
   - If the `impeccable` skill is available and `impeccable_use` is `unasked`, ask once whether to use it
     for this phase, recommending it and saying it uses some tokens, and record the answer in
     `impeccable_use`. With `impeccable_use: yes`, have it design both (`/impeccable <request>`, or
     `/impeccable:impeccable <request>` when it is installed as a plugin). Ask it for two static pages,
     `docs/preview-a.html` and `docs/preview-b.html`, and no app code yet. Give it what it needs instead of
     letting it ask the user again: `docs/plan.md`, who uses the app and where, the bar above, and that
     this is an app screen people use to get work done. Answer its questions from the plan and the state
     file yourself; ask the user only what those do not say.
   - Otherwise, design both yourself against the bar.

   Show both: screenshots at a phone's width (390 × 844) when you have the browser, otherwise say how to
   open the files (double-click, or on their phone). The user picks one, or asks to mix them. Keep the
   chosen one as `docs/preview.html` and delete the other.
5. **Critique before any code.**
   - With `impeccable_use: yes`: run its critique on `docs/preview.html`
     (`/impeccable critique docs/preview.html`, or `/impeccable:impeccable critique docs/preview.html`).
   - Otherwise: offer a critique by a separate reviewer, saying it uses some tokens, and with a yes run it
     with your agent's subagent tool. Give it
     the file, its screenshot if you have one, and the bar above, not your own reasoning; ask what looks
     dated, generic or confusing, most important first. Without a yes or without a subagent tool,
     critique it yourself against the bar and tell the user it is a self-review, weaker than a separate one.

   Fix what the critique finds, then show the result and say in one or two sentences what changed. When
   Impeccable is installed, `npx impeccable detect docs/preview.html` costs no tokens: run it too, it
   exits with code 2 when it finds problems.
6. **Write the direction** from the chosen preview in `docs/design.md`, short: colours as named values,
   the text sizes, the spacing scale, the main components and the designed states. If Impeccable wrote a
   `DESIGN.md`, that is the direction: do not write a second one.
7. **Agree**, then record the direction's path and `docs/preview.html` in `.afrotools/studio.md`, set
   `phase: build`, and say in one sentence what the next phase does.
