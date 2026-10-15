/* =====================================================================
   Static checks (no network). Fails the build if a security setting is
   removed or weakened, a form loses its spam protection, a secret is
   committed, or the shared header/footer drift apart between pages.

   Writes reports/config-check.json for the maintenance agent.
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { redact } from "./lib/redact.mjs";

const ROOT = process.cwd();
const results = [];
const check = (id, ok, detail, severity = "high") => results.push({ id, ok: Boolean(ok), severity, detail });
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith(".html"));

/* ---------- 1. Security headers (netlify.toml is the live config) ---------- */
const REQUIRED_HEADERS = {
  "Content-Security-Policy": ["default-src 'self'", "script-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"],
  "Strict-Transport-Security": ["max-age="],
  "X-Frame-Options": ["DENY"],
  "X-Content-Type-Options": ["nosniff"],
  "Referrer-Policy": ["strict-origin"],
  "Permissions-Policy": ["camera=()", "microphone=()", "geolocation=()"],
};
const FORBIDDEN_CSP = ["'unsafe-eval'", "script-src *", "script-src 'self' 'unsafe-inline'", "default-src *"];

const toml = read("netlify.toml");
for (const [name, mustContain] of Object.entries(REQUIRED_HEADERS)) {
  const m = toml.match(new RegExp(`^\\s*${name}\\s*=\\s*"([^"]*)"`, "m"));
  check(`header:${name}`, m && mustContain.every((s) => m[1].includes(s)),
    m ? `netlify.toml ${name} must include: ${mustContain.join(", ")}` : `netlify.toml is missing ${name}`, "critical");
}
const csp = (toml.match(/Content-Security-Policy\s*=\s*"([^"]*)"/) || [])[1] || "";
for (const bad of FORBIDDEN_CSP) check(`csp-not-weakened:${bad}`, !csp.includes(bad), `CSP must not contain ${bad}`, "critical");

// vercel.json (backup host config) should carry the same CSP
try {
  const vj = JSON.parse(read("vercel.json"));
  const vcsp = vj.headers?.[0]?.headers?.find((h) => h.key === "Content-Security-Policy")?.value;
  check("vercel-csp-matches", vcsp === csp, "vercel.json CSP should match netlify.toml CSP", "low");
} catch { check("vercel-json-valid", false, "vercel.json is not valid JSON", "medium"); }

// Internal project files must not be publicly downloadable
for (const p of ["/scripts/*", "/tests/*", "/docs/*", "/README.md", "/package.json", "/package-lock.json"]) {
  check(`blocked-path:${p}`, toml.includes(`from = "${p}"`), `netlify.toml should block public access to ${p}`, "medium");
}

/* ---------- 2. No inline scripts or third-party scripts (CSP relies on it) ---------- */
for (const f of pages) {
  const html = read(f);
  const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/g)];
  check(`no-inline-script:${f}`, inline.length === 0, `${f}: inline <script> blocks would be blocked by the CSP`, "high");
  const ext = [...html.matchAll(/<script[^>]*\bsrc="(https?:)?\/\//g)];
  check(`no-third-party-script:${f}`, ext.length === 0, `${f}: third-party scripts are not allowed`, "high");
  check(`no-inline-handlers:${f}`, !/\son[a-z]+="/i.test(html), `${f}: inline event handlers (onclick=...) are not allowed`, "high");
}

/* ---------- 3. Forms keep Netlify handling + spam protection ---------- */
for (const [file, name] of [["contact.html", "contact"], ["reviews.html", "review"]]) {
  const html = read(file);
  const form = (html.match(new RegExp(`<form[^>]*name="${name}"[\\s\\S]*?</form>`)) || [""])[0];
  check(`form:${name}:exists`, form, `${file}: form "${name}" not found`, "critical");
  check(`form:${name}:netlify`, /data-netlify="true"/.test(form), `${file}: form "${name}" must keep data-netlify="true"`, "critical");
  check(`form:${name}:honeypot`, /netlify-honeypot="bot-field"/.test(form) && /name="bot-field"/.test(form), `${file}: form "${name}" must keep its honeypot spam trap`, "high");
  check(`form:${name}:form-name`, new RegExp(`name="form-name" value="${name}"`).test(form), `${file}: hidden form-name input missing`, "critical");
}

/* ---------- 4. Shared header/footer identical on every page (drift check) ---------- */
const block = (html, re) => (html.match(re) || [""])[0].replace(/\s+aria-current="page"/g, "").replace(/href="\//g, 'href="');
const ref = read("index.html");
for (const [label, re] of [["header", /<header class="site-header">[\s\S]*?<\/header>/], ["footer", /<footer class="site-footer">[\s\S]*?<\/footer>/]]) {
  const expected = block(ref, re);
  for (const f of pages) {
    check(`${label}-consistent:${f}`, block(read(f), re) === expected, `${f}: ${label} differs from index.html - update all pages together`, "medium");
  }
}

/* ---------- 5. Secrets must never be committed ---------- */
let tracked = [];
try { tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean); } catch { /* not a git checkout */ }
const SECRET_RES = [/sk-ant-[A-Za-z0-9_-]{10,}/, /gh[pousr]_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /(?:AKIA|ASIA)[0-9A-Z]{16}/, /rzp_live_[A-Za-z0-9]{8,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /nfp_[A-Za-z0-9]{20,}/];
for (const f of tracked) {
  if (/\.(png|jpe?g|webp|gif|ico|woff2?)$/i.test(f) || f.startsWith("node_modules/")) continue;
  let text = "";
  try { text = read(f); } catch { continue; }
  const hit = SECRET_RES.find((re) => re.test(text));
  check(`no-secrets:${f}`, !hit, `${f}: looks like it contains a secret (${hit}) - remove it and rotate the key`, "critical");
}
check("no-env-files", !tracked.some((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".example")), ".env files must not be committed", "critical");

/* ---------- 6. Domain + canonical URLs (SEO) ---------- */
const DOMAIN = "https://harnoorsingh.in";
for (const f of pages) {
  const html = read(f);
  check(`no-netlify-app:${f}`, !html.includes("netlify.app"), `${f}: still references a .netlify.app address`, "high");
  if (f === "404.html") continue;
  const want = f === "index.html" ? `${DOMAIN}/` : `${DOMAIN}/${f.replace(/\.html$/, "")}`;
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1];
  check(`canonical:${f}`, canon === want, `${f}: canonical should be ${want} (found ${canon || "none"})`, "high");
}
check("sitemap-domain", read("sitemap.xml").includes(`<loc>${DOMAIN}/</loc>`) && !read("sitemap.xml").includes(".html"), "sitemap.xml must list clean https://harnoorsingh.in URLs", "high");
check("robots-sitemap", read("robots.txt").includes(`Sitemap: ${DOMAIN}/sitemap.xml`), "robots.txt must point to the harnoorsingh.in sitemap", "high");

/* ---------- Report ---------- */
const failed = results.filter((r) => !r.ok);
const blocking = failed.filter((r) => r.severity !== "info" && r.severity !== "low");
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/config-check.json", redact({ tool: "check-config", checked: results.length, failed }));
for (const r of failed) console.log(`${r.severity === "info" || r.severity === "low" ? "WARN" : "FAIL"} [${r.severity}] ${r.id}: ${r.detail}`);
console.log(`\ncheck-config: ${results.length} checks, ${blocking.length} failing, ${failed.length - blocking.length} warnings`);
process.exit(blocking.length ? 1 : 0);
