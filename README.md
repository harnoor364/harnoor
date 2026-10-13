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

## Deploying on Netlify

1. In Netlify: **Add new site → Import an existing project →** choose this GitHub repo.
2. Build command: *(leave empty)*. Publish directory: `.` (already set in `netlify.toml`).
3. Deploy. Netlify finds the two forms (`contact` and `review`) automatically.
   In **Forms → Form notifications** you can turn on email notifications.

### After you have your final web address

Search the project for `harnoorsingh.netlify.app` and replace it with your real domain in all `.html`
files, `robots.txt` and `sitemap.xml`. These URLs drive the WhatsApp / Facebook link previews (Open Graph).

## Previewing locally

Open `index.html` in a browser, or run a small server so all links behave like on Netlify:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
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
