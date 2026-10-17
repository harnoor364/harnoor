# Cookies, consent and analytics

## How consent works on this site

- `js/consent.js` shows a slim banner under the header on the first visit, with three equal
  buttons: **Accept all**, **Reject non-essential**, **Customise**.
- Categories: **Essential** (always on: the consent choice itself and the client-login session),
  **Analytics**, **Marketing**.
- The choice is stored in `localStorage` as `uw_consent` for about 6 months, then the banner asks again.
- "Cookie settings" in the footer (and on /cookie-policy) reopens the preferences.
- Before a choice, and after "Reject non-essential", **no analytics or marketing code is loaded at all**.
- The site never asks for browser permissions (location, notifications, camera, microphone).

## Adding Google Analytics 4 (optional)

1. Create a GA4 property and copy its Measurement ID (looks like `G-ABC123XYZ`).
2. In `js/data.js`, set `analyticsId: "G-ABC123XYZ"`.
3. Allow Google's analytics domains in the Content-Security-Policy, in **both** `netlify.toml`
   and `vercel.json` (the site's own check makes sure they match):
   - add ` https://www.googletagmanager.com` to `script-src`
   - add ` https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com` to `connect-src`
   - add ` https://*.google-analytics.com https://www.googletagmanager.com` to `img-src`
4. Update the Analytics row in `/cookie-policy` with the cookies GA sets (`_ga`, `_ga_<ID>`, up to 2 years
   by default; you can shorten this in GA → Admin → Data retention) and say that analytics is now in use.
5. Deploy. GA loads only for visitors who click **Accept all**, or tick Analytics under **Customise**,
   using Google Consent Mode v2 (all signals default to "denied" first).

Marketing cookies are not used. If you ever add an advertising pixel, load it the same way:
only inside the `c.marketing` branch of `apply()` in `js/consent.js`, and list it in the Cookie Policy.
