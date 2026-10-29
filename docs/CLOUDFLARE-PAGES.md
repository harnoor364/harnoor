# Hosting on Cloudflare Pages (free)

The site builds for Cloudflare Pages with `npm run build:cloudflare`, which writes the public site to `dist/`:
only the pages, `css/`, `js/`, `images/`, icons, `robots.txt`, `sitemap.xml` and `site.webmanifest`, plus a
`_headers` file generated from `netlify.toml` (same security headers; keep editing them in `netlify.toml`).

Cloudflare Pages does by itself what most Netlify redirects did:
- `/pricing` serves `pricing.html`, and `/pricing.html` → `/pricing` (308); `/index.html` → `/`.
- Private files (README, scripts, tests, docs, package.json…) are not in `dist/`, so they return 404.
- Unknown addresses show `404.html` with a 404 status.

## 1. Create the Pages project (about 10 minutes)

1. Sign up (free) at <https://dash.cloudflare.com>.
2. **Workers & Pages → Create → Pages → Connect to Git**. Allow Cloudflare to see GitHub and choose
   **harnoor364/harnoor**.
3. Build settings:
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: `npm run build:cloudflare`
   - Build output directory: `dist`
   - Environment variable: `NODE_VERSION` = `22`
   (No Supabase variables needed: the build has the live project's public values built in.)
4. **Save and Deploy**. When it finishes you get an address like `https://harnoor.pages.dev`.
   Open it and check the homepage, `/pricing`, `/login` and the cookie banner.

## 2. Move the domain (about 10 minutes, then a few hours for it to switch over)

1. In the Pages project: **Custom domains → Set up a custom domain → `harnoorsingh.in`**.
   Cloudflare asks you to add the domain to Cloudflare first (choose the **Free** plan).
2. **Check the DNS records Cloudflare imported** before switching. Keep any `TXT` records (Google
   Search Console verification, email) and any `MX` records (email). If one is missing, copy it from
   your domain registrar's DNS page.
3. Cloudflare shows **two nameservers**. At the company where you bought harnoorsingh.in, replace the
   nameservers with those two. The switch takes from minutes to a few hours; the site stays up meanwhile.
4. Add **`www.harnoorsingh.in`** as a second custom domain, then **Rules → Redirect Rules → Create rule
   → "Redirect from WWW to root"** (permanent, 301), so `www` goes to `https://harnoorsingh.in`.
5. **SSL/TLS → Edge Certificates**: "Always Use HTTPS" = On.

## 3. After the switch

- Open https://harnoorsingh.in in a private window: banner, logins, WhatsApp and Call links.
- In Netlify, delete the old site (or turn off its builds) so it can't publish old versions.
- Unchanged: Supabase (same domain), Google Analytics, Search Console, Secure Privacy.
- **Contact form:** Cloudflare has no built-in form service like Netlify Forms. The form already
  falls back to opening WhatsApp with the visitor's details, so no enquiry is lost. (`generate_lead`
  is only sent for a successful form submission, so it won't fire for the WhatsApp fallback.)
