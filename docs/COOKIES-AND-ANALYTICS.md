# Cookies, consent and analytics

## How consent works on this site

- **Secure Privacy** (`https://app.secureprivacy.ai/script/6ae342a084533a312ef42b66.js`) shows the cookie
  banner, remembers each visitor's choice and sends Google Consent Mode updates. It is the **first script**
  in `<head>` on every page. Banner text, categories and the cookie list are managed in the Secure Privacy
  dashboard, not in this repository.
- `js/analytics.js` (next in `<head>`) sets the Consent Mode v2 defaults to "denied" before the Google tag.
  The site's own code never grants consent.
- "Cookie settings" links (footer, Cookie Policy) are handled by `js/cookie-settings.js`: they reopen
  Secure Privacy's preference center. The function names it tries are at the top of that file; if your
  dashboard's Hyperlink widget shows a different call, put it first. Without Secure Privacy loaded, the
  link opens /cookie-policy.
- CSP: `https://app.secureprivacy.ai` is allowed in script-src, style-src, font-src, frame-src, img-src and
  connect-src (`netlify.toml` and `vercel.json`). If the browser console shows a CSP error naming another
  Secure Privacy address, add it there too.
- The site never asks for browser permissions (location, notifications, camera, microphone).

## Google Analytics 4 (in use: G-3D4ERRL2NK)

- Every page's `<head>` starts with the Secure Privacy script, then `<script src="/js/analytics.js">` and then the Google tag
  (`https://www.googletagmanager.com/gtag/js?id=G-3D4ERRL2NK`). The tag code lives in a file, not inline,
  because the CSP only allows the site's own scripts (`script-src 'self'`).
- `js/analytics.js` sets **Consent Mode v2 defaults to "denied"** (`analytics_storage`, `ad_storage`,
  `ad_user_data`, `ad_personalization`) before the tag loads, then runs `gtag('config', 'G-3D4ERRL2NK')`
  with `page_location` minus the `#…` part.
- Secure Privacy calls `gtag('consent', 'update', …)` when the visitor chooses.
- Events (all with `page_path`): `whatsapp_click` (any link to wa.me / api.whatsapp.com), `call_click`
  (any `tel:` link), `generate_lead` (successful contact form submission, from `js/main.js`).
- The CSP in **both** `netlify.toml` and `vercel.json` allows Google: `*.googletagmanager.com` in `script-src`,
  `img-src` and `connect-src`, and `*.google-analytics.com` / `*.analytics.google.com` in `connect-src` and `img-src`.
- To change the ID: edit it in `js/analytics.js`, in the `<head>` of every page, and in the Cookie Policy
  table (`_ga_<ID>` cookie).

Marketing cookies are not used. If you ever add an advertising pixel, set it up in Secure Privacy so it
only runs after consent, and list it in the Cookie Policy.
