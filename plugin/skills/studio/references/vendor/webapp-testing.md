<!-- source: anthropics/skills@ca45fc496a34/skills/webapp-testing/SKILL.md | license: Apache-2.0 | modified: yes — frontmatter turned into a note (a reference, not a skill); Python Playwright and the with_server.py helper replaced by Node Playwright and the project's own dev server command (Studio needs Node only); bundled scripts and examples not copied -->
> Original skill `webapp-testing`: Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.

# Web Application Testing

To test local web applications, write Playwright scripts for Node (`npx playwright`, or `@playwright/test` when the project already uses it).

## Decision Tree: Choosing Your Approach

```
User task → Is it static HTML?
    ├─ Yes → Read HTML file directly to identify selectors
    │         ├─ Success → Write Playwright script using selectors
    │         └─ Fails/Incomplete → Treat as dynamic (below)
    │
    └─ No (dynamic webapp) → Is the server already running?
        ├─ No → Start it with the project's own command (e.g. `npm run dev`) in the
        │        background, wait until its port answers, then write a simplified script
        │
        └─ Yes → Reconnaissance-then-action:
            1. Navigate and wait for networkidle
            2. Take screenshot or inspect DOM
            3. Identify selectors from rendered state
            4. Execute actions with discovered selectors
```

## Example

With the server already running, include only Playwright logic:
```js
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true }); // Always launch chromium in headless mode
const page = await browser.newPage();
await page.goto("http://localhost:5173"); // Server already running and ready
await page.waitForLoadState("networkidle"); // CRITICAL: Wait for JS to execute
// ... your automation logic
await browser.close();
```

## Reconnaissance-Then-Action Pattern

1. **Inspect rendered DOM**:
   ```js
   await page.screenshot({ path: "inspect.png", fullPage: true });
   const content = await page.content();
   await page.locator("button").all();
   ```

2. **Identify selectors** from inspection results

3. **Execute actions** using discovered selectors

## Common Pitfall

❌ **Don't** inspect the DOM before waiting for `networkidle` on dynamic apps
✅ **Do** wait for `page.waitForLoadState("networkidle")` before inspection

## Best Practices

- Always close the browser when done
- Use descriptive selectors: `text=`, `role=`, CSS selectors, or IDs
- Add appropriate waits: `page.waitForSelector()` or `page.waitForTimeout()`
