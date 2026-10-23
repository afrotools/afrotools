---
name: API Changed Report
about: Report that a provider has changed their API — endpoint, auth, fields, or behavior
title: "[API Change] <Provider> — <what changed>"
labels: api-change, needs-review
assignees: ""
---

## Provider

<!-- Which provider changed? -->
**Provider:** <!-- e.g. Wave, Paycard, NimbaSMS -->
**Category:** <!-- payment / communications -->

## What changed

<!-- Check all that apply -->
- [ ] Endpoint URL changed
- [ ] Authentication method changed
- [ ] Request field added / removed / renamed
- [ ] Response field added / removed / renamed
- [ ] HTTP status code changed
- [ ] Error format changed
- [ ] Behavior changed (without API change)
- [ ] New capability available
- [ ] Capability deprecated or removed

## Details

<!-- Describe exactly what changed. Be as specific as possible. -->

**Before:**
```
<!-- old behavior / field / value -->
```

**After:**
```
<!-- new behavior / field / value -->
```

## Source

<!-- Where did you learn about this change? -->
- [ ] Provider changelog / release notes
- [ ] Provider official communication (email / Slack)
- [ ] My integration broke in production
- [ ] Monitoring alert (automated hash change)
- [ ] Community report

**Link to source (if applicable):**

## Affected specs

<!-- Which specs in this repo are affected? -->
- `specs/<category>/<provider>/<capability>/schema.json`

## Impact

<!-- How urgent is this? -->
- [ ] 🔴 Breaking — integrations using the current spec will fail
- [ ] 🟠 Partial — some integrations affected, workaround exists
- [ ] 🟡 Additive — new field / capability, nothing broken yet
- [ ] 🟢 Minor — documentation update only

---

> Reported by: <!-- your GitHub handle or "automated monitor" -->
> Date detected: <!-- YYYY-MM-DD -->
