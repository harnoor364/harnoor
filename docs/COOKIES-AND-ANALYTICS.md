# Cookies, consent and analytics

## How consent works on this site

- `js/consent.js` shows a slim banner under the header on the first visit, with three equal
  buttons: **Accept all**, **Reject non-essential**, **Customise**.
- Categories: **Essential** (always on: the consent choice itself and the client-login session),
  **Analytics**, **Marketing**.
- The choice is stored in `localStorage` as `uw_consent` for about 6 months, then the banner asks again.
- "Cookie settings" in the footer (and on /cookie-policy) reopens the preferences.
- Before a choice, and after "Reject non-essential", **no analytics or marketing cookies are set**. The Google
  tag still loads, but Consent Mode keeps `analytics_storage` (and all ad signals) "denied", so GA only gets
  cookie-free signals.
- The site never asks for browser permissions (location, notifications, camera, microphone).

## Google Analytics 4 (in use: G-3D4ERRL2NK)

- Every page's `<head>` starts with `<script src="/js/analytics.js">` and then the Google tag
  (`https://www.googletagmanager.com/gtag/js?id=G-3D4ERRL2NK`). The tag code lives in a file, not inline,
  because the CSP only allows the site's own scripts (`script-src 'self'`).
- `js/analytics.js` sets **Consent Mode v2 defaults to "denied"** (`analytics_storage`, `ad_storage`,
  `ad_user_data`, `ad_personalization`) before the tag loads. If `uw_consent` already says Analytics is
  allowed, it switches `analytics_storage` to "granted" straight away (returning visitors are counted
  without the banner). Then it runs `gtag('config', 'G-3D4ERRL2NK')` with `page_location` minus the `#…` part.
- `js/consent.js` calls `gtag('consent', 'update', …)` when the visitor chooses. Ad signals always stay "denied".
- Events (all with `page_path`): `whatsapp_click` (any link to wa.me / api.whatsapp.com), `call_click`
  (any `tel:` link), `generate_lead` (successful contact form submission, from `js/main.js`).
- The CSP in **both** `netlify.toml` and `vercel.json` allows Google: `*.googletagmanager.com` in `script-src`,
  `img-src` and `connect-src`, and `*.google-analytics.com` / `*.analytics.google.com` in `connect-src` and `img-src`.
- To change the ID: edit it in `js/analytics.js`, in the `<head>` of every page, and in the Cookie Policy
  table (`_ga_<ID>` cookie).

Marketing cookies are not used. If you ever add an advertising pixel, load it the same way:
only inside the `c.marketing` branch of `apply()` in `js/consent.js`, and list it in the Cookie Policy.
