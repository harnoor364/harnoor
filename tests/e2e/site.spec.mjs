/* End-to-end smoke tests: every page loads with the live security headers,
   without JavaScript errors, blocked resources or horizontal scrolling,
   and the key parts of the site still work. */
import { test, expect } from "@playwright/test";

// Never contact Google or Secure Privacy from tests: answer their scripts and hits with empty responses.
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/([a-z0-9-]+\.)*((googletagmanager|google-analytics|analytics\.google)\.com|secureprivacy\.ai)\//, (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
});

const PAGES = ["index", "portfolio", "pricing", "seo", "reviews", "contact", "doctors", "restaurants", "shops", "services", "hosiery", "thank-you", "404", "signup", "login", "forgot-password", "reset-password", "account", "privacy-policy", "terms", "cookie-policy", "refund-policy"];
// Google Fonts may be unreachable in CI sandboxes; the site falls back to system fonts.
const IGNORE = /fonts\.(googleapis|gstatic)\.com/;

for (const name of PAGES) {
  test(`${name}.html loads cleanly`, async ({ page }) => {
    const problems = [];
    page.on("pageerror", (e) => problems.push(`JS error: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !IGNORE.test(m.text())) problems.push(`console: ${m.text()}`); });
    page.on("requestfailed", (r) => { if (!IGNORE.test(r.url())) problems.push(`request failed: ${r.url()}`); });
    page.on("response", (r) => { if (r.status() >= 400 && !/\/404\.html$/.test(r.url())) problems.push(`HTTP ${r.status()}: ${r.url()}`); });

    const url = name === "index" ? "/" : name === "404" ? "/404.html" : `/${name}`;
    const res = await page.goto(url);
    expect(res.status(), "page status").toBe(name === "404" ? 200 : 200);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("header.site-header")).toBeVisible();
    await expect(page.locator("footer.site-footer")).toBeAttached();
    await expect(page.locator("a.wa-float")).toHaveAttribute("href", /^https:\/\/wa\.me\/917973353244\?text=/);
    await expect(page.locator("h1")).toHaveCount(1);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "no horizontal scrolling").toBeLessThanOrEqual(1);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("data-driven sections render", async ({ page }) => {
  await page.goto("/portfolio");
  expect(await page.locator("[data-projects] .project-card").count()).toBeGreaterThan(1);
  await page.goto("/pricing");
  await expect(page.locator("[data-pricing] .price-card")).toHaveCount(3);
  await expect(page.locator("[data-plans] .price-card")).toHaveCount(3);
  await page.goto("/");
  expect(await page.locator("[data-projects='featured'] .project-card").count()).toBeGreaterThan(0);
});

test("pricing buttons open WhatsApp with the plan name", async ({ page }) => {
  await page.goto("/pricing");
  const href = await page.locator("[data-plans] .price-card a").first().getAttribute("href");
  expect(decodeURIComponent(href)).toContain("Basic Maintenance");
});

test("contact form validates input and keeps spam protection", async ({ page }) => {
  await page.goto("/contact");
  const form = page.locator("form[name=contact]");
  await expect(form).toHaveAttribute("data-netlify", "true");
  await expect(form.locator("input[name=bot-field]")).toBeAttached();
  await page.fill("#c-phone", "abc");
  expect(await page.$eval("#c-phone", (e) => e.checkValidity())).toBe(false);
  await page.fill("#c-phone", "+91 98765 43210");
  expect(await page.$eval("#c-phone", (e) => e.checkValidity())).toBe(true);
  await form.locator("button[type=submit]").click();
  expect(await page.$eval("#c-name", (e) => e.checkValidity())).toBe(false); // required field stops submit
});

test("review text is shown as text, never as HTML", async ({ page }) => {
  // Serve data.js with a malicious review appended, exactly as if it had been pasted in
  await page.route("**/js/data.js", async (route) => {
    const res = await route.fetch();
    const body = (await res.text()) + `
REVIEWS.push({ name: "<img src=x onerror=window.__xss=1>", business: "<b>biz</b>", rating: 5,
  text: "<script>window.__xss=1<\\/script><img src=x onerror=window.__xss=1>", photo: "javascript:window.__xss=1",
  website: "javascript:window.__xss=1", featured: true });`;
    await route.fulfill({ response: res, body });
  });
  await page.goto("/reviews");
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".review-card")).toHaveCount(1);
  await expect(page.locator(".review-card blockquote")).toContainText("<script>");   // shown as text
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();                     // never executed
  expect(await page.locator(".review-card a[href^='javascript:']").count()).toBe(0);   // unsafe link dropped
});

test("mobile menu opens and closes", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/");
  await page.click(".nav-toggle");
  await expect(page.locator("body")).toHaveClass(/nav-open/);
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveClass(/nav-open/);
});
