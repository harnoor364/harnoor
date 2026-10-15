# Harnoor Singh — Web Design Portfolio

A fast, mobile-first portfolio website for my web design business in Ludhiana.
Plain HTML, CSS and JavaScript: no build step, no frameworks. It deploys directly on Netlify.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Home: hero, What I do, featured projects, how it works, featured reviews, call-to-action |
| `portfolio.html` | All projects |
| `pricing.html` | Basic / Standard / Premium packages. "Get Started" opens WhatsApp with the package name |
| `reviews.html` | Average rating, all reviews, and the **Leave a Review** form (Netlify Forms) |
| `contact.html` | Contact details and the **Contact** form (Netlify Forms) |
| `seo.html` | SEO services in Ludhiana: what's included, SEO plans, guide article and FAQ |
| `doctors.html` | Website design for doctors & clinics: features, clinic projects and a guide |
| `thank-you.html`, `404.html` | Form fallback page and "page not found" |

## Editing content: `js/data.js`

Almost everything you'll want to change is in **`js/data.js`**:

- **`SITE`**: WhatsApp number, email and location.
- **`PROJECTS`**: portfolio cards. To add a project, copy one `{ ... }` block and change the values.
  `featured: true` also puts it on the Home page (max 3). Leave `url: ""` until the site is live
  (the button then shows "Live link coming soon").
- **`REVIEWS`**: approved reviews (see below). `featured: true` puts a review on the Home page (max 2).
- **`PACKAGES`**: website package cards, prices and what each package includes.
- **`MONTHLY_PLANS`**: the Monthly Care & Growth Plans (Basic Maintenance, SEO Growth, Complete Care) on the Packages page.
  `badge: "Best Value"` highlights a card. The contract note below the cards is in `pricing.html`.

To change page text (headlines, paragraphs), edit it directly in the `.html` files.
To change colours or fonts, edit the variables at the top of `css/style.css` (`--accent` is the brand brown, `--bg` the cream background).

### Project screenshots

Screenshots live in `images/projects/`. The current images are **preview illustrations** drawn in each
site's real colours and headline. Replace them with real screenshots once each site is live:

1. Open the live site on a laptop and take a screenshot of the top of the page (16:10 works best, e.g. 1280×800).
2. Save it as `.webp` or `.jpg` (under ~200 KB) in `images/projects/`.
3. Update that project's `image:` path in `js/data.js`.

## Reviews: approve before publishing

1. Clients submit the form on `reviews.html`.
2. Netlify emails you / shows it under **Site → Forms → review** (with any uploaded photo).
3. Nothing appears on the site automatically. To publish a review, copy it into `REVIEWS` in `js/data.js`
   (save the photo into `images/reviews/` if there is one) and push.

Until you have real reviews, the review sections show a friendly "Leave a review" card.
To see how review cards look, open `reviews.html?preview` or `index.html?preview`. That shows clearly
labelled example reviews which normal visitors never see.

## SEO keywords

| Keyword | Where it's used |
| --- | --- |
| website designer in Ludhiana | Home page title, description and guide article |
| website design company in Ludhiana | Home "What I do" section and guide article |
| website design for doctors | `doctors.html` (title, heading, guide article); linked from Home and footer |
| affordable website design in Ludhiana | Packages page title, heading, cost guide and FAQ (with FAQ structured data) |
| SEO services in Ludhiana, SEO company in Ludhiana, SEO expert in Ludhiana, local SEO services, Google Business Profile optimization | `seo.html` (title, heading, guide article, FAQ with structured data) |
| web designer near me | Comes from your **Google Business Profile**, not the website (see below) |

**Google Business Profile** (for "near me" searches): create a free profile at business.google.com,
pick the category **Website designer**, set the area to Ludhiana, and add your website link, WhatsApp number
and work photos. Use exactly the same name, phone number and location as on this website. Ask happy clients
to leave Google reviews.

After the site is live, add it to **Google Search Console** and submit `sitemap.xml`.

## Security & fixing problems

**Already built in**
- Plain HTML/CSS/JS: no login, database or server code to attack.
- Security headers in `netlify.toml` (and `vercel.json`, if you ever move to Vercel): HTTPS only,
  no framing by other sites, and only this site's own scripts can run.
- Forms: spam honeypot, and all text from reviews is escaped before it is shown.

**Your checklist**
1. Turn on **two-factor authentication** for GitHub, Netlify, your domain registrar and the Google account used for Search Console.
2. At your domain registrar: turn on **auto-renew** and **domain lock** (transfer lock).
3. Never paste API keys or passwords into this repository; it is public.
4. Netlify → Forms: turn on **spam filtering** and email notifications.
5. Free uptime monitoring (e.g. UptimeRobot) emails you if the site goes down.

**If an update breaks something**
- Netlify → **Deploys** → open the last working deploy → **Publish deploy**. The site rolls back instantly.
- Every change is saved in GitHub history, so any change can be undone.
- Check Google Search Console → **Pages** now and then for errors.

## Deploying on Netlify

1. In Netlify: **Add new site → Import an existing project →** choose this GitHub repo.
2. Build command: *(leave empty)*. Publish directory: `.` (already set in `netlify.toml`).
3. Deploy. Netlify finds the two forms (`contact` and `review`) automatically.
   In **Forms → Form notifications** you can turn on email notifications.

### Web address

The live domain is **https://harnoorsingh.in**. Page addresses, link previews (Open Graph), the sitemap and robots.txt all use it,
with clean URLs (`/doctors`, not `/doctors.html`). `netlify.toml` permanently redirects the old Netlify address and `.html` URLs.

## Previewing locally

Run a small server that understands clean URLs (`/doctors` → `doctors.html`), like Netlify:

```bash
npx serve .
# then visit the address it prints (usually http://localhost:3000)
```

(Forms send through Netlify Forms when hosted on Netlify. On any other host, such as Vercel, they open WhatsApp with the details filled in instead.)

## Structure

```
├── index.html, portfolio.html, pricing.html, reviews.html, contact.html
├── thank-you.html, 404.html
├── css/style.css          ← all styles (colours at the top)
├── js/data.js             ← EDIT ME: contact info, projects, reviews, packages
├── js/main.js             ← site behaviour (menu, cards, forms, animations)
├── images/                ← favicon, social preview (og-image.jpg), project screenshots
├── netlify.toml, robots.txt, sitemap.xml
```
