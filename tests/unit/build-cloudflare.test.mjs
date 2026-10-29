/* The Cloudflare Pages build copies only public files and keeps the security headers. */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("build:cloudflare outputs the public site with netlify.toml's headers", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "cf-dist-"));
  execFileSync(process.execPath, ["scripts/build-cloudflare.mjs"], { env: { ...process.env, OUT_DIR: out, SKIP_GENERATE: "1" }, stdio: "pipe" });
  const has = (f) => fs.existsSync(path.join(out, f));

  // every root page and asset folder is there
  for (const f of fs.readdirSync(".").filter((f) => f.endsWith(".html"))) assert.ok(has(f), `missing ${f}`);
  for (const f of ["css/style.css", "js/analytics.js", "js/cookie-settings.js", "js/main.js", "images/og-image.jpg", "robots.txt", "sitemap.xml", "site.webmanifest", "favicon.ico", "404.html"]) assert.ok(has(f), `missing ${f}`);
  // nothing private
  for (const f of ["README.md", "package.json", "package-lock.json", "netlify.toml", "vercel.json", "playwright.config.mjs", ".htmlvalidate.json", "scripts", "tests", "docs", ".github", "node_modules", "reports"]) assert.ok(!has(f), `private ${f} was copied`);

  // _headers: same CSP as netlify.toml, plus the other rules
  const headers = fs.readFileSync(path.join(out, "_headers"), "utf8");
  const tomlCsp = fs.readFileSync("netlify.toml", "utf8").match(/Content-Security-Policy\s*=\s*"([^"]*)"/)[1];
  assert.ok(headers.includes(`/*\n  Content-Security-Policy: ${tomlCsp}\n`), "CSP must match netlify.toml");
  for (const line of ["Strict-Transport-Security: max-age=63072000; includeSubDomains", "X-Frame-Options: DENY", "/js/*", "/account*\n  Cache-Control: no-store", "/reset-password*"]) {
    assert.ok(headers.includes(line), `_headers is missing: ${line}`);
  }
  fs.rmSync(out, { recursive: true, force: true });
});
