# 2. Phased implementation plan

| Phase | What | Status |
|---|---|---|
| 1 | Read-only inspection and assessment | ✅ Done (`1-ASSESSMENT.md`) |
| 2 | Monitoring: live monitor, CI checks, secret scan, dependency audit, integrity check, redaction | ✅ Code in this PR |
| 3 | AI-assisted diagnosis: evidence collection, Claude diagnosis, guarded patch, tests, draft PR | ✅ Code in this PR |
| 4 | Safeguards: least privilege, path/content guard, untrusted-data handling, cost cap | ✅ Code in this PR |
| 5 | Approval & recovery: draft PRs only, branch protection, rollback steps, incident records | ✅ Code + **your settings** (SETUP) |
| 6 | Turn it on: merge this PR, add secrets/variables, enable branch protection, test once | ⏳ **Your action** (SETUP) |
| Later | Privacy page, client consent for screenshots, self-hosted font, remove inline styles, real domain | Open (human decisions) |

**Rollout order (about 20 minutes):** SETUP steps 1→8. Then run the monitor manually once,
then trigger one AI diagnosis on a test issue to confirm the whole loop works.
