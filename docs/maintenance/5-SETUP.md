# 6. Setup, environment variables and costs

## One-time setup (about 20 minutes)
1. **Review and merge** the pull request that adds this system (GitHub → Pull requests).
2. **Live site address** → GitHub repo → **Settings → Secrets and variables → Actions → Variables** →
   New variable `SITE_URL` = your live address, e.g. `https://your-site.netlify.app` (no trailing slash).
3. **Claude API key** → create one at **console.anthropic.com** → API keys (add a payment method and a
   monthly spend limit, e.g. US$5, under Billing → Limits). Then GitHub → **Settings → Secrets and
   variables → Actions → Secrets** → New secret `ANTHROPIC_API_KEY`.
4. **Protect `main`** → **Settings → Branches → Add rule** (or Rulesets) for `main`: require a pull
   request, require 1 approval, require review from Code Owners, require status check **CI checks / checks**,
   block force pushes. (Leave "Allow administrators to bypass" off.)
5. **Let workflows open PRs** → **Settings → Actions → General → Workflow permissions** →
   "Read repository contents" (default) and tick **Allow GitHub Actions to create and approve pull requests**.
6. **Netlify** → your site → **Forms**: enable form detection, turn on **spam filtering** and **email
   notifications**. **Deploys → Deploy settings**: production branch `main`, **deploy previews on** for pull requests.
7. **Email alerts** → on GitHub, **Watch** the repository (All activity, or Custom → Issues + Pull requests)
   and check github.com/settings/notifications has **Email** enabled.
8. **Test it** → **Actions → Live site monitor → Run workflow**. Then create an issue titled
   "Test incident" and add the label `ai-diagnose`: within a few minutes the AI posts a report.

Optional: a free **UptimeRobot** monitor (5-minute checks, email) as a second, independent alarm.
GitHub's scheduled runs can be delayed and pause after 60 days without repository activity.

## Environment variables and secrets
| Name | Where | Required | Purpose |
|---|---|---|---|
| `SITE_URL` | Actions **variable** | Yes (monitor) | Live https address to monitor |
| `ANTHROPIC_API_KEY` | Actions **secret** | Yes (AI agent) | Claude API access for the diagnosis step only |
| `GITHUB_TOKEN` | Automatic | — | Issues, branches, PRs (scoped per workflow) |
| `SLOW_MS` | Optional env | No | Slow-page threshold (default 4000 ms) |
| `MAX_RUNS_PER_DAY` | In `ai-diagnose.yml` | No | AI cost cap (default 5) |

No Netlify token is used anywhere, by design: nothing in this system can deploy.

## Cost estimate
| Item | Cost |
|---|---|
| GitHub Actions (CI, monitor every 30 min, AI workflow) | **Free** for public repositories |
| Dependabot, gitleaks, npm audit, Playwright, html-validate | **Free** |
| Netlify (hosting, forms, deploy previews) | **Free** tier (check your plan's form-submission limits) |
| Claude API (`claude-opus-5-5`: US$4 / 1M input, US$20 / 1M output tokens) | ~35k input + ~5–10k output tokens per diagnosis ≈ **US$0.25–0.40 per incident** |
| Typical month (0–5 incidents) | **≈ US$0–2** |
| Worst case (cap of 5 runs every day) | ≈ US$2/day. Set a spend limit in the Anthropic console |
| UptimeRobot (optional) | Free plan |

The only unavoidable cost is the Claude API, and only when an incident occurs.
To run with no AI cost at all: don't add `ANTHROPIC_API_KEY`. Monitoring and CI still work,
and the incident issue tells you a diagnosis could not be produced.
