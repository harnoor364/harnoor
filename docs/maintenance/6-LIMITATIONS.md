# 7. Limitations and checks that still need a human

**Nothing here makes the website "completely secure".** It reduces risk and shortens the time to notice problems.

## What this system cannot see or do
- **Your accounts.** The biggest risk. Turn on 2FA for GitHub, Netlify, your domain registrar and Google,
  and review who has access every few months. No check here can see account settings.
- **Netlify settings** (form detection, spam filtering, deploy branch, members): check them yourself.
- **Form submissions** are never read (privacy by design), so spam or abuse in submissions is not monitored.
- **Visitor-side errors in real browsers** are not collected (no error-tracking service, by choice).
  The browser tests cover desktop and mobile Chrome only.
- **Server logs / rejected requests**: Netlify doesn't offer log access on the free plan, so repeated
  rejected requests and attack patterns can't be monitored. Netlify's own DDoS protection applies.
- **Monitoring gaps:** GitHub scheduled runs can be late by several minutes and pause after 60 days
  without repository activity. Add UptimeRobot for an independent check.
- **The AI can be wrong.** It sees only redacted evidence and a few source files. Its "confirmed findings"
  are only as good as the evidence; treat every proposed fix as a suggestion.
- **Redaction is pattern-based** and may miss unusual secret formats or over-redact harmless numbers.

## Always needs a human
- Approving and merging every pull request (AI or Dependabot) after checking the **Netlify preview**
- Any change to `netlify.toml`, security headers, workflows, tests or dependencies (the agent is blocked from these)
- Security incidents: rollback, key rotation, contacting clients if their data was involved
- Legal and consent questions: privacy notice, client screenshots, reviews you publish
- Opening downloaded review photos: open image files only, never run attachments
- A periodic manual review (every 3–6 months): this checklist, account access, Netlify forms, plan limits
- Professional penetration testing if the site ever adds logins, payments or a database
