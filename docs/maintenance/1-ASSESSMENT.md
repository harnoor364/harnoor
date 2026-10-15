# 1. Security & reliability assessment

**Scope:** the portfolio website in this repository (`harnoor364/harnoor`), hosted on Netlify.
**Method:** read-only review of the code, the git history and GitHub branch settings (Phase 1), then
automated checks added in this change. No production data was accessed.
✅ = confirmed from code or GitHub · 🔶 = needs checking in your Netlify/GitHub account.

> This assessment lists what was found. It does **not** prove the website is secure.

## What the site is
| Area | Finding |
|---|---|
| Stack | Plain HTML/CSS/JS, 12 pages, no framework, no build step ✅ |
| Backend / database / login | **None** ✅. Login monitoring, SQL injection and session handling do not apply |
| Forms | Netlify Forms (contact, review with photo upload) + WhatsApp fallback ✅ |
| Hosting / deploy | Netlify, publishes the repo root; pushes to `main` deploy automatically 🔶 |
| Third parties | Google Fonts; wa.me links ✅ |

## Issues, severity and status
| # | Issue | Severity | Status after this change |
|---|---|---|---|
| 1 | Changes went straight to `main`/live with no review or tests | High | **Fixed in code** (CI checks, AI changes only as draft PRs). **You must** turn on branch protection: see SETUP step 4 |
| 2 | Netlify form detection may be off, so submissions could be lost | High 🔶 | **You must check** Netlify → Forms (SETUP step 6) |
| 3 | Placeholder domain `harnoorsingh.netlify.app` used in 61 places | High | Open: send your real address; the config check warns until fixed |
| 4 | No privacy notice although forms collect personal data (DPDP Act 2023) | Medium | Open: add a privacy page (human/legal decision) |
| 5 | Header/footer copied into 12 pages can drift apart | Medium | **Mitigated:** `check-config` fails if any copy differs |
| 6 | Client screenshots show names/contact details without documented consent | Medium | Open: get consent or blur (human decision) |
| 7 | Review photo uploads are unchecked files | Medium | Open: treat uploads as untrusted (LIMITATIONS) |
| 8 | No monitoring or alerts | Medium | **Fixed:** live monitor every 30 min + email via GitHub issues |
| 9 | WhatsApp fallback puts form data in a URL | Low | Accepted; mention in privacy notice |
| 10 | README, config and scripts publicly downloadable | Low | **Fixed:** blocked in `netlify.toml`, checked by CI and the monitor |
| 11 | CSP allows inline styles | Low | Open: move inline styles to CSS, then tighten |
| 12 | Google Fonts sends visitor IPs to Google | Low | Open: optionally self-host the font |
| 13 | Found by the new checks: raw `&` in 2 titles, Shops/SEO titles too long, honeypot inputs without `type` | Low | **Fixed** |
| 14 | Found by the new tests: contact phone validation silently disabled in modern browsers | Medium | **Fixed** earlier, now covered by a test |

## Security controls now in place
- CSP + HSTS + frame/sniff/referrer/permissions headers (enforced by `check-config` and the live monitor)
- Output escaping and URL allow-listing in `js/main.js` (tested with a malicious review)
- Spam honeypots on both forms (enforced by `check-config` and tests)
- Secret scanning (gitleaks + `check-config`), dependency audit (npm audit + Dependabot)
- Live integrity check: live JS/CSS must match the repository (detects tampering or unreviewed deploys)
