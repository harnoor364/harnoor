/* =====================================================================
   Cloudflare Pages build:   npm run build:cloudflare   (output folder: dist)

   1. Runs the same steps as the Netlify build: js/supabase-config.js and
      sitemap.xml. Skipped when SKIP_GENERATE=1 (used by the unit test).
   2. Copies ONLY the public files into dist/: the pages, css/, js/, images/,
      icons, robots.txt, sitemap.xml, site.webmanifest. Private files
      (scripts/, tests/, docs/, README, package.json, configs…) are never
      uploaded, so they can't be opened on the live site.
   3. Writes dist/_headers from the [[headers]] blocks in netlify.toml, so the
      security headers (CSP etc.) stay identical: edit them in netlify.toml only.

   With ADMIN_ONLY=1 (used on Render) it publishes only the admin panel instead.

   Not needed on Cloudflare: the clean-URL redirects (Cloudflare Pages serves
   /pricing for pricing.html and redirects /pricing.html → /pricing by itself)
   and the domain redirects (set up in the Cloudflare dashboard, see
   docs/CLOUDFLARE-PAGES.md).
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();
const OUT = path.resolve(process.env.OUT_DIR || "dist");
const fail = (msg) => { console.error(`build-cloudflare: ${msg}`); process.exit(1); };

// 1. Generated files (same as the Netlify build command)
if (process.env.SKIP_GENERATE !== "1") {
  execFileSync(process.execPath, ["scripts/build-config.mjs"], { stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/build-sitemap.mjs"], { stdio: "inherit" });
}

// ADMIN_ONLY=1 (set on the Render service): publish ONLY the admin panel.
// The public website stays on Netlify; the admin's menu links point to it.
if (process.env.ADMIN_ONLY === "1") {
  const SITE = "https://harnoorsingh.in";
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of ["css", "images"]) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });
  fs.mkdirSync(path.join(OUT, "js/vendor"), { recursive: true });
  for (const f of ["js/admin.js", "js/data.js", "js/main.js", "js/cookie-settings.js", "js/supabase-config.js", "js/vendor/supabase-2.116.0.js", "js/vendor/supabase-LICENSE.txt"]) {
    fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  }
  for (const f of ["favicon.ico", "site.webmanifest"]) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  let html = fs.readFileSync(path.join(ROOT, "admin.html"), "utf8");
  // No analytics or cookie banner on the private admin host (only the owner uses it).
  html = html.replace(/\s*<!-- Secure Privacy[^\n]*-->\n\s*<script src="https:\/\/app\.secureprivacy\.ai[^"]*"><\/script>/, "");
  html = html.replace(/\s*<!-- Google tag[^\n]*-->\n\s*<script src="\/js\/analytics\.js"><\/script>\n\s*<script async src="https:\/\/www\.googletagmanager\.com[^"]*"><\/script>/, "");
  // Page links go to the public website; files (images, icons, manifest) stay local.
  html = html.replace(/href="\/(?!images\/|favicon|site\.webmanifest|css\/|js\/)([^"]*)"/g, (_, rest) => `href="${SITE}/${rest}"`);
  if (/secureprivacy|googletagmanager/.test(html)) fail("admin-only build: could not remove the analytics/consent scripts");
  fs.writeFileSync(path.join(OUT, "index.html"), html);
  fs.writeFileSync(path.join(OUT, "admin.html"), html);
  fs.writeFileSync(path.join(OUT, "robots.txt"), "User-agent: *\nDisallow: /\n");
  fs.writeFileSync(path.join(OUT, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n  X-Frame-Options: DENY\n");
  console.log(`build-cloudflare: ADMIN_ONLY → admin panel only (${path.relative(ROOT, OUT) || OUT})`);
  process.exit(0);
}

// 2. Public files only
const PUBLIC_DIRS = ["css", "js", "images"];
const PUBLIC_ROOT_FILE = /\.(html|ico|png|svg|webmanifest|txt|xml)$/i;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(ROOT)) {
  if (fs.statSync(path.join(ROOT, f)).isFile() && PUBLIC_ROOT_FILE.test(f)) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
}
for (const d of PUBLIC_DIRS) fs.cpSync(path.join(ROOT, d), path.join(OUT, d), { recursive: true });

// 3. _headers from netlify.toml
const toml = fs.readFileSync(path.join(ROOT, "netlify.toml"), "utf8");
const rules = [];
for (const block of toml.split(/^\[\[/m).slice(1)) {
  if (!block.startsWith("headers]]")) continue;
  const forPath = (block.match(/^\s*for\s*=\s*"([^"]+)"/m) || [])[1];
  const values = block.split(/^\s*\[headers\.values\]\s*$/m)[1] || "";
  const headers = [...values.matchAll(/^\s*([A-Za-z0-9-]+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/gm)].map((m) => [m[1], m[2].replace(/\\"/g, '"')]);
  if (!forPath || !headers.length) fail(`could not read a [[headers]] block in netlify.toml:\n[[${block.slice(0, 120)}`);
  rules.push(`${forPath}\n${headers.map(([k, v]) => `  ${k}: ${v}`).join("\n")}`);
}
const headersFile = `# Generated by scripts/build-cloudflare.mjs from netlify.toml. Edit netlify.toml, not this file.\n${rules.join("\n\n")}\n`;
fs.writeFileSync(path.join(OUT, "_headers"), headersFile);

// Safety checks: the security policy made it across, and nothing private was copied.
const csp = (headersFile.match(/^\s*Content-Security-Policy: (.*)$/m) || [])[1] || "";
if (!/script-src 'self'/.test(csp) || !/frame-ancestors 'none'/.test(csp)) fail("dist/_headers is missing the Content-Security-Policy");
for (const priv of ["README.md", "package.json", "netlify.toml", "vercel.json", "scripts", "tests", "docs", ".github", "node_modules"]) {
  if (fs.existsSync(path.join(OUT, priv))) fail(`private file copied into ${OUT}: ${priv}`);
}
const pages = fs.readdirSync(OUT).filter((f) => f.endsWith(".html")).length;
console.log(`build-cloudflare: ${pages} pages, ${rules.length} header rules → ${path.relative(ROOT, OUT) || OUT}`);
