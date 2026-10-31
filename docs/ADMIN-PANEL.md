# Admin panel: harnoorsingh.in/admin

Edit the website without touching code. Changes show on the site as soon as you save; no publishing needed.

## What you can edit

| Tab | Changes |
|---|---|
| Business details | Phone, WhatsApp number, email, location, default WhatsApp message (footer, contact page, every WhatsApp button) |
| Portfolio | Add / edit / reorder / delete projects, upload screenshots, choose which 3 show on the Home page |
| Reviews | Add real client reviews; choose which 2 show on the Home page |
| Website packages | Names, prices, taglines, what's included, "Most Popular" badge |
| Monthly plans | Same for the monthly plans |
| Client projects | Each client's project name, status and notes (what they see on /account) |

Not editable here (ask for a code change): page headings and paragraphs, SEO titles and descriptions, the
search-engine data (JSON-LD), legal pages. **Prices also appear in the Pricing page's text and search-engine
data**: if you change a price in the panel, have those updated too so they match.

## How it works

- Sign in with your website account. Only accounts in the Supabase `admins` table can save, enforced by
  Supabase's Row Level Security, not just by the page. Others see "No admin access".
- Content is stored in the `site_content` table (one row per section). `js/content.js` loads it on every
  page and redraws those sections. If Supabase is slow or down, the built-in content in `js/data.js` shows.
- Images go to the public `site-media` storage bucket (JPG, PNG or WebP, up to 5 MB).
- Database setup: `docs/supabase/admin-setup.sql`. Add or remove an admin with the commands at its end
  (Supabase → SQL Editor).

## Good to know

- Supabase's free plan **pauses a project after about a week without activity**. Once the website gets
  regular visitors it stays awake. If it pauses, logins and the admin panel stop working (the website itself
  still shows the built-in content): open supabase.com and click **Restore project**.
- Turn on **Authentication → Attack Protection → Leaked password protection** in Supabase if your plan
  includes it, and use a strong, unique password for your admin account.
- Keep `js/data.js` roughly in step with the panel: it's the backup content shown when Supabase can't be reached.
