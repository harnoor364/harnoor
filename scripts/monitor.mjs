/* =====================================================================
   Live website monitor (run by GitHub Actions on a schedule).

   Checks the LIVE site at SITE_URL for:
     - availability, HTTP status and response time of every page
     - security headers still being served
     - internal files staying blocked (README, scripts, ...)
     - unexpected code changes: live JS/CSS must match the repository
     - forms still present, HTTPS certificate not about to expire

   Read-only: it only sends GET requests. It never submits forms.
   Writes reports/monitor.json and reports/monitor-summary.md (redacted).
   Exit code 1 = at least one check failed.
   ===================================================================== */
import fs from "node:fs";
import crypto from "node:crypto";
import tls from "node:tls";
import { redact } from "./lib/redact.mjs";

const SITE_URL = (process.env.SITE_URL || "").replace(/\/+$/, "");
// MONITOR_LOCAL_TEST=1 allows http://127.0.0.1 (used by the unit tests only)
const LOCAL_TEST = process.env.MONITOR_LOCAL_TEST === "1" && /^http:\/\/127\.0\.0\.1:\d+$/.test(SITE_URL);
if (!LOCAL_TEST && !/^https:\/\/[a-z0-9.-]+$/i.test(SITE_URL)) {
  console.error("SITE_URL must be set to your live https address, e.g. https://example.netlify.app (Settings → Secrets and variables → Actions → Variables).");
  process.exit(2);
}
const SLOW_MS = Number(process.env.SLOW_MS || 4000);
const TIMEOUT_MS = 15000;
const PAGES = ["/", "/portfolio.html", "/pricing.html", "/seo.html", "/reviews.html", "/contact.html", "/doctors.html", "/restaurants.html", "/shops.html", "/services.html"];
const MUST_MATCH_REPO = ["js/main.js", "js/data.js", "css/style.css"];
const MUST_BE_BLOCKED = ["/README.md", "/package.json", "/scripts/monitor.mjs", "/netlify.toml"];
const REQUIRED_HEADERS = { "content-security-policy": "frame-ancestors 'none'", "x-frame-options": "DENY", "x-content-type-options": "nosniff", "strict-transport-security": "max-age=" };

const checks = [];
const add = (id, ok, detail, severity = "high", data = {}) => checks.push({ id, ok, severity, detail, ...data });

async function get(path) {
  const started = Date.now();
  try {
    const res = await fetch(SITE_URL + path, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "User-Agent": "harnoor-site-monitor/1.0 (+github actions)" } });
    const body = await res.text();
    return { status: res.status, ms: Date.now() - started, headers: res.headers, body };
  } catch (e) {
    return { status: 0, ms: Date.now() - started, error: e.name === "TimeoutError" ? `timed out after ${TIMEOUT_MS} ms` : e.message };
  }
}
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

// 1. Pages: availability, speed, content, headers
for (const p of PAGES) {
  const r = await get(p);
  add(`page${p}`, r.status === 200, r.status ? `${p} returned HTTP ${r.status}` : `${p} unreachable: ${r.error}`, "critical", { ms: r.ms });
  if (r.status !== 200) continue;
  add(`slow${p}`, r.ms <= SLOW_MS, `${p} took ${r.ms} ms (limit ${SLOW_MS} ms)`, "medium", { ms: r.ms });
  add(`content${p}`, /<h1[\s>]/.test(r.body) && r.body.includes("Harnoor Singh"), `${p} is missing expected content (possible defacement or broken deploy)`, "high");
  for (const [h, must] of Object.entries(REQUIRED_HEADERS)) {
    const v = r.headers.get(h) || "";
    add(`header:${h}${p}`, v.includes(must), `${p}: security header ${h} missing or weakened (got "${v.slice(0, 80)}")`, "high");
  }
}

// 2. Unknown page returns 404, internal files stay blocked
const nf = await get(`/this-page-should-not-exist-${Date.now()}`);
add("404-page", nf.status === 404, `Unknown URLs should return 404, got ${nf.status}`, "low");
for (const p of MUST_BE_BLOCKED) {
  const r = await get(p);
  add(`blocked${p}`, r.status === 404 || (r.status === 200 && /<p class="big-code">404<\/p>/.test(r.body) && /^\s*<!DOCTYPE html>/i.test(r.body)), `${p} is publicly downloadable (HTTP ${r.status})`, "medium");
}

// 3. Unexpected code changes: live files must match the repository
for (const f of MUST_MATCH_REPO) {
  const r = await get("/" + f);
  if (r.status !== 200) { add(`integrity:${f}`, false, `/${f} returned HTTP ${r.status}`, "critical"); continue; }
  const local = fs.readFileSync(f, "utf8");
  const same = sha(local) === sha(r.body);
  add(`integrity:${f}`, same, `Live /${f} differs from the repository (live ${sha(r.body)} vs repo ${sha(local)}): an unreviewed deploy or tampering`, "critical");
}

// 4. Forms still present on the live pages
for (const [p, name] of [["/contact.html", "contact"], ["/reviews.html", "review"]]) {
  const r = await get(p);
  add(`form:${name}`, r.status === 200 && new RegExp(`<form[^>]*name="${name}"`).test(r.body) && r.body.includes('name="bot-field"'), `${p}: the ${name} form or its spam trap is missing`, "high");
}

// 5. HTTPS certificate expiry
const host = new URL(SITE_URL).hostname;
const daysLeft = LOCAL_TEST ? 365 : await new Promise((resolve) => {
  const s = tls.connect({ host, port: 443, servername: host, timeout: TIMEOUT_MS }, () => {
    const cert = s.getPeerCertificate();
    s.end();
    resolve(cert?.valid_to ? Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000) : null);
  });
  s.on("error", () => resolve(null));
  s.on("timeout", () => { s.destroy(); resolve(null); });
});
add("tls-certificate", daysLeft !== null && daysLeft > 14, daysLeft === null ? "Could not read the HTTPS certificate" : `HTTPS certificate expires in ${daysLeft} days`, daysLeft !== null && daysLeft > 3 ? "medium" : "critical", { daysLeft });

// Report (redacted) -------------------------------------------------------
const failed = checks.filter((c) => !c.ok);
const order = ["critical", "high", "medium", "low"];
const worst = failed.map((c) => c.severity).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] || "none";
const report = { tool: "monitor", site: SITE_URL, time: new Date().toISOString(), checked: checks.length, worst_severity: worst, failed, passed: checks.filter((c) => c.ok).map((c) => c.id) };
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/monitor.json", redact(report));
const summary = [
  `**Site:** ${SITE_URL}  `,
  `**Checked:** ${report.time}, ${checks.length} checks, **${failed.length} failing** (worst: ${worst})`,
  "",
  ...(failed.length ? ["| Severity | Check | Detail |", "|---|---|---|", ...failed.map((c) => `| ${c.severity} | \`${c.id}\` | ${c.detail.replace(/\|/g, "\\|")} |`)] : ["All checks passed."]),
].join("\n");
fs.writeFileSync("reports/monitor-summary.md", redact(summary));
console.log(redact(summary));
process.exit(failed.length ? 1 : 0);
