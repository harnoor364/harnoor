# 4. Incident report format

The AI agent writes this automatically (`reports/incident-report.md`, also posted on the issue).
Use the same format when you write one by hand.

```markdown
# Incident report INC-YYYYMMDD-HHMM

| | |
|---|---|
| Status | Open / Investigating / Fix proposed / Resolved / Closed (no action) |
| Severity | critical / high / medium / low / info |
| Security incident | Yes / No evidence of one |
| Detected | date-time (UTC) + how (monitor, CI, visitor, AI) |
| Diagnosed by | person or AI model, and whether a human verified it |
| Approval | Pending / Approved by <name> on <date> / Rejected |

## Summary            (2–3 sentences, plain language)
## Impact             (who/what is affected: pages, forms, visitors)
## Confirmed findings (each with the exact evidence: report line, URL, test name)
## Hypotheses         (NOT confirmed; for each: how to confirm)
## Probable cause
## Recommended fix
## Proposed code change  (PR link, files changed, guard result)
## Test results       (each check ✅/❌)
## Containment        (security incidents only: roll back, rotate keys, lock deploys)
## Actions for a human (checklist)
## Rollback           (Netlify: publish last good deploy · GitHub: revert the PR)
## Resolution         (filled in by a human: what was done, when, by whom)
```

**Severity guide**
| Severity | Examples |
|---|---|
| critical | Site down; live code differs from the repo (possible tampering); secret leaked; forms removed |
| high | Security header missing; a page broken; forms not working; certificate expiring in < 3 days |
| medium | Slow pages; broken link; internal file downloadable; drifted header/footer |
| low | Validation warnings, cosmetic issues |
| info | Notes, no action needed |
