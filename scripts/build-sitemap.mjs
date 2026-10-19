/* =====================================================================
   Netlify build step: regenerates sitemap.xml on every deploy.

   - Lists every .html page in the site root EXCEPT pages marked
     <meta name="robots" content="noindex…"> (login, account, thank-you,
     404…), so new public pages are added automatically.
   - URLs match how Netlify serves them: https://harnoorsingh.in/page
     (no .html, no trailing slash); the homepage is https://harnoorsingh.in/
   - <lastmod> = date of the page file's last git commit (file dates in a
     fresh checkout are all the same, so they'd be meaningless). Falls back
     to today if git history isn't available.
   - No <priority>/<changefreq>: Google ignores them.
   ===================================================================== */
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const DOMAIN = "https://harnoorsingh.in";
const today = new Date().toISOString().slice(0, 10);

const lastCommitDate = (file) => {
  try {
    const d = execFileSync("git", ["log", "-1", "--format=%cs", "--", file], { encoding: "utf8" }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today;
  } catch {
    return today;
  }
};

const pages = fs.readdirSync(".")
  .filter((f) => f.endsWith(".html") && f !== "404.html")
  .filter((f) => !/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(fs.readFileSync(f, "utf8")))
  .sort((a, b) => (a === "index.html" ? -1 : b === "index.html" ? 1 : a.localeCompare(b)));

const urls = pages.map((f) => {
  const loc = f === "index.html" ? `${DOMAIN}/` : `${DOMAIN}/${f.replace(/\.html$/, "")}`;
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastCommitDate(f)}</lastmod>\n  </url>`;
});

fs.writeFileSync("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
console.log(`build-sitemap: wrote sitemap.xml with ${urls.length} pages`);
