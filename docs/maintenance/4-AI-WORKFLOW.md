# 5. Safe AI maintenance workflow

```
 Live monitor (every 30 min)        CI on main fails         You add label "ai-diagnose"
            │                              │                          │
            └──────────── opens an "incident" issue (GitHub emails you) ─┘
                                           │
                         AI incident diagnosis workflow
   1. Daily cost cap (5 runs/day)  · only the owner or this repo's workflows can start it
   2. Collect FRESH evidence from approved sources only:
      monitor, config check, link check, HTML validation, npm audit, browser tests
   3. Redact secrets + personal data (scripts/lib/redact.mjs)
   4. Claude (claude-opus-5-5) reads the evidence AS DATA: no tools, cannot run anything
      → JSON answer: severity, confirmed findings vs hypotheses, cause, fix, optional patch
   5. Guard (scripts/agent/guard.mjs) checks any patch: allowed files only, no weakening
      of security controls, no scripts/handlers/iframes/secrets, size-limited
   6. Patch applied in the isolated GitHub runner → ALL project checks re-run
      (fixed command list, never taken from the AI). Failing patch is undone.
   7. Incident report posted on the issue
   8. Only if steps 5–6 pass: DRAFT pull request on an ai-fix/* branch + CI run
                                           │
                 YOU review the diff + Netlify deploy preview → approve & merge
                                           │
                         Netlify deploys (rollback = publish previous deploy)
```

## Guardrails (and where they are enforced)
| Rule | Enforced by |
|---|---|
| Visitor input, logs, pages and reports are untrusted data, never instructions | System prompt; evidence wrapped in `<untrusted_evidence>`; AI has no tools |
| No arbitrary commands from logs or visitor input | Agent runs only the fixed `CHECKS` list in `diagnose.mjs`; issue number must be numeric |
| Agent limited to approved files | `guard.mjs` allow-list (`*.html`, `css/`, `js/main.js`, `js/data.js`, sitemap, robots) |
| Never disable security checks, tests, headers or logging to pass | `guard.mjs` blocks `netlify.toml`, tests, scripts, workflows, package files; `check-config` fails if headers/forms/honeypots are weakened |
| Secrets never committed or sent to the AI | `redact.mjs`; gitleaks + `check-config` secret scan; API key only in the agent step's environment (cleared for test runs) |
| Least privilege | Workflows default to read-only; only the agent job can write, and only branches/PRs/issues. No Netlify token exists anywhere, so the agent **cannot deploy** |
| Human approval before production changes | Draft PRs only; branch protection + CODEOWNERS require your approval to merge |
| Never claims the site is secure | Prompt rule + `validateDiagnosis` rejects such claims |
| Confirmed vs hypothesis | Required separate fields in the JSON schema; report shows them separately |
| Serious security incident → alert + containment, no improvised fixes | `security_incident=true` blocks any patch; report lists containment steps; you are emailed via the issue |
| Cost control | 5 runs/day cap; runs only on new incidents (monitor de-duplicates) |

## OWASP coverage for this stack (static site)
| OWASP Top 10 area | Status |
|---|---|
| A01 Broken access control | No accounts or admin area. Internal files blocked (checked live) |
| A02 Cryptographic failures | HTTPS + HSTS; certificate expiry monitored |
| A03 Injection / XSS | All dynamic content escaped; CSP blocks inline/third-party scripts; XSS test in CI |
| A04 Insecure design | Reviews moderated by you before publishing; forms handled by Netlify |
| A05 Security misconfiguration | Headers enforced by CI and checked on the live site |
| A06 Vulnerable components | No runtime dependencies; npm audit + Dependabot for check tools |
| A07 Auth failures | Not applicable (no login). **Your accounts are the real target: use 2FA** |
| A08 Integrity failures | Live JS/CSS must match the repo; Actions pinned to major versions; Dependabot updates |
| A09 Logging & monitoring | Live monitor + CI + incident issues; redacted reports |
| A10 SSRF | Not applicable (no server code) |

## Rollback
1. **Live site:** Netlify → **Deploys** → last good deploy → **Publish deploy** (seconds).
2. **Code:** GitHub → the merged PR → **Revert** → merge the revert PR.
3. **Security incident:** roll back first, then rotate any exposed key (GitHub, Netlify, Anthropic),
   check Netlify → Site settings → Members and GitHub → Settings → Collaborators for unknown users,
   and review the latest commits. Do not delete the site or repository.
