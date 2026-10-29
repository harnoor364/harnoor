/* Cookie consent + Google Analytics (GA4, Consent Mode v2):
   the tag is on every page with all consent "denied" by default, no analytics
   cookies before a choice, rejection keeps it denied, accepting grants
   analytics_storage only, the choice is remembered for returning visitors,
   preferences work by keyboard, and the banner never covers the WhatsApp
   button or the hero call-to-action on phones. */
import { test, expect } from "@playwright/test";
import fs from "node:fs";

// Never contact Google from tests: answer the tag and hits with empty responses.
async function stubGoogle(page) {
  await page.route(/https:\/\/([a-z0-9-]+\.)*(googletagmanager|google-analytics|analytics\.google)\.com\//, (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
}
test.beforeEach(async ({ page }) => { await stubGoogle(page); });

const gaTags = (page) => page.locator('head script[src^="https://www.googletagmanager.com/gtag/js?id=G-3D4ERRL2NK"]').count();
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("uw_consent") || "null"));
// dataLayer entries are `arguments` objects: turn them into plain arrays
const layer = (page) => page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a).map((x) => (x instanceof Date ? "date" : x))));
const consentCalls = async (page) => (await layer(page)).filter((a) => a[0] === "consent");
const events = async (page, name) => (await layer(page)).filter((a) => a[0] === "event" && a[1] === name);
const gaCookies = async (page) => (await page.context().cookies()).filter((c) => c.name.startsWith("_ga"));
const DENIED = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };

test("first visit: tag is in the head with every consent signal denied; banner shows; nothing stored", async ({ page }) => {
  await page.goto("/");
  const banner = page.locator(".consent-banner");
  await expect(banner).toBeVisible();
  await expect(banner.locator("button")).toHaveText(["Accept all", "Reject non-essential", "Customise"]);
  expect(await gaTags(page)).toBe(1);
  // the consent defaults run before the Google tag script in <head>
  const order = await page.evaluate(() => Array.from(document.head.querySelectorAll("script[src]")).map((s) => s.getAttribute("src")).slice(0, 2));
  expect(order).toEqual(["/js/analytics.js", "https://www.googletagmanager.com/gtag/js?id=G-3D4ERRL2NK"]);
  const consent = await consentCalls(page);
  expect(consent[0][1]).toBe("default");
  expect(consent[0][2]).toMatchObject(DENIED);
  expect(consent.some((c) => JSON.stringify(c).includes("granted"))).toBe(false);
  const cfg = (await layer(page)).find((a) => a[0] === "config");
  expect(cfg[1]).toBe("G-3D4ERRL2NK");
  expect(cfg[2].page_location).toBe(new URL(page.url()).origin + "/");
  expect(await stored(page)).toBeNull();
  expect(await gaCookies(page)).toEqual([]);
});

test("the three banner buttons carry equal visual weight", async ({ page }) => {
  await page.goto("/");
  const boxes = await page.locator(".consent-banner button").evaluateAll((els) => els.map((e) => {
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    return { w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, color: s.color, border: s.borderColor, weight: s.fontWeight, size: s.fontSize };
  }));
  for (const b of boxes.slice(1)) {
    expect(Math.abs(b.w - boxes[0].w)).toBeLessThanOrEqual(2);
    expect(b.h).toBe(boxes[0].h);
    expect([b.bg, b.color, b.border, b.weight, b.size]).toEqual([boxes[0].bg, boxes[0].color, boxes[0].border, boxes[0].weight, boxes[0].size]);
  }
});

test("Reject non-essential keeps analytics denied, now and after reload", async ({ page }) => {
  await page.goto("/");
  await page.click(".consent-banner >> text=Reject non-essential");
  await expect(page.locator(".consent-banner")).toHaveCount(0);
  expect(await stored(page)).toMatchObject({ v: 1, essential: true, analytics: false, marketing: false });
  const last = (await consentCalls(page)).pop();
  expect(last[1]).toBe("update");
  expect(last[2]).toMatchObject(DENIED);
  await page.reload();
  await expect(page.locator(".consent-banner")).toHaveCount(0);
  expect((await consentCalls(page)).some((c) => JSON.stringify(c).includes("granted"))).toBe(false);
  expect(await gaCookies(page)).toEqual([]);
});

test("Accept all grants analytics_storage only (ads stay denied)", async ({ page }) => {
  await page.goto("/");
  await page.click(".consent-banner >> text=Accept all");
  const last = (await consentCalls(page)).pop();
  expect(last[1]).toBe("update");
  expect(last[2]).toMatchObject({ analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
});

test("returning visitor who accepted: granted before the tag config, no banner", async ({ page }) => {
  await page.goto("/");
  await page.click(".consent-banner >> text=Accept all");
  await page.goto("/pricing");
  await expect(page.locator(".consent-banner")).toHaveCount(0);
  const l = await layer(page);
  const granted = l.findIndex((a) => a[0] === "consent" && a[1] === "update" && a[2].analytics_storage === "granted");
  const config = l.findIndex((a) => a[0] === "config");
  expect(granted).toBeGreaterThan(0);          // after the "default" call…
  expect(granted).toBeLessThan(config);         // …and before the tag is configured
});

test("Customise works with the keyboard; Esc changes nothing; saving analytics only", async ({ page }) => {
  await page.goto("/");
  // The banner is the first thing after "Skip to content"
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator(".consent-banner a, .consent-banner button").first()).toBeFocused();
  await page.locator(".consent-banner >> text=Customise").focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("dialog.consent-dialog");
  await expect(dialog).toBeVisible();
  await expect(page.locator("#c-essential")).toBeChecked();
  await expect(page.locator("#c-essential")).toBeDisabled();
  await expect(page.locator("#c-analytics")).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(await stored(page)).toBeNull();
  await page.click(".consent-banner >> text=Customise");
  await page.locator("#c-analytics").focus();
  await page.keyboard.press("Space");
  await page.click("dialog.consent-dialog >> text=Save my choices");
  expect(await stored(page)).toMatchObject({ analytics: true, marketing: false });
  const update = (await consentCalls(page)).filter((a) => a[1] === "update").pop()[2];
  expect(update).toMatchObject({ analytics_storage: "granted", ad_storage: "denied" });
});

test("footer Cookie settings reopens preferences with the saved choice", async ({ page }) => {
  await page.goto("/");
  await page.click(".consent-banner >> text=Reject non-essential");
  await page.click(".site-footer [data-cookie-settings]");
  await expect(page.locator("dialog.consent-dialog")).toBeVisible();
  await expect(page.locator("#c-analytics")).not.toBeChecked();
  await page.click("dialog.consent-dialog >> text=Accept all");
  expect(await stored(page)).toMatchObject({ analytics: true, marketing: true });
});

test("the choice expires after about 6 months", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("uw_consent", JSON.stringify({ v: 1, ts: Date.now() - 170 * 864e5, essential: true, analytics: false, marketing: false })));
  await page.reload();
  await expect(page.locator(".consent-banner")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("uw_consent", JSON.stringify({ v: 1, ts: Date.now() - 190 * 864e5, essential: true, analytics: false, marketing: false })));
  await page.reload();
  await expect(page.locator(".consent-banner")).toBeVisible();
});

for (const width of [360, 375]) {
  test(`banner covers neither the WhatsApp button nor the hero CTA at ${width}px`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height: 740 } });
    await stubGoogle(page);
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const box = async (sel) => page.locator(sel).first().boundingBox();
    const banner = await box(".consent-banner");
    const overlap = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlap(banner, await box(".wa-float"))).toBe(false);
    expect(overlap(banner, await box(".hero .btn-whatsapp"))).toBe(false);
    expect(overlap(banner, await box(".hero .btn-outline"))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    await page.close();
  });
}

test("the site never asks for browser permissions", async () => {
  const code = ["js/main.js", "js/consent.js", "js/analytics.js", "js/auth.js", "js/auth-state.js", "js/data.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
  expect(code).not.toMatch(/geolocation|Notification\.requestPermission|getUserMedia|navigator\.permissions|PushManager|getDisplayMedia/);
});

/* ---------- GA4 events ---------- */
const stopNavigation = (page) => page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault()));

test("a click on a WhatsApp link sends whatsapp_click with the page path", async ({ page }) => {
  await page.goto("/pricing");
  await page.click(".consent-banner >> text=Reject non-essential");
  await stopNavigation(page);
  await page.locator('a[href*="wa.me"]').first().click();
  const ev = await events(page, "whatsapp_click");
  expect(ev).toHaveLength(1);
  expect(ev[0][2]).toMatchObject({ page_path: "/pricing" });
  // api.whatsapp.com links count too
  await page.evaluate(() => { const a = document.createElement("a"); a.href = "https://api.whatsapp.com/send?phone=917973353244"; a.id = "t-api"; a.textContent = "x"; document.body.append(a); });
  await page.click("#t-api");
  expect(await events(page, "whatsapp_click")).toHaveLength(2);
});

test("a click on a phone link sends call_click", async ({ page }) => {
  await page.goto("/contact");
  await stopNavigation(page);
  await page.evaluate(() => { const a = document.createElement("a"); a.href = "tel:+917973353244"; a.id = "t-tel"; a.innerHTML = "<span>Call</span>"; document.body.append(a); });
  await page.click("#t-tel span");
  const ev = await events(page, "call_click");
  expect(ev).toHaveLength(1);
  expect(ev[0][2]).toMatchObject({ page_path: "/contact" });
  expect(await events(page, "whatsapp_click")).toHaveLength(0);
});

test("a successful contact form submission sends generate_lead (a failed one does not)", async ({ page }) => {
  let ok = false;
  await page.route("**/", (r) => (r.request().method() === "POST"
    ? r.fulfill({ status: ok ? 200 : 500, body: "" }) : r.fallback()));
  await page.goto("/contact");
  await page.click(".consent-banner >> text=Reject non-essential");
  await page.fill("#c-name", "Dr A");
  await page.fill("#c-phone", "+91 98765 43210");
  await page.selectOption("#c-type", { index: 1 });
  await page.evaluate(() => { window.open = () => null; });      // the failure path opens WhatsApp instead
  await page.click("form[name=contact] button[type=submit]");
  await expect(page.locator("form[name=contact] .form-status")).toContainText("WhatsApp");
  expect(await events(page, "generate_lead")).toHaveLength(0);
  ok = true;
  await page.click("form[name=contact] button[type=submit]");
  await expect(page.locator("#contact-success")).toBeVisible();
  const ev = await events(page, "generate_lead");
  expect(ev).toHaveLength(1);
  expect(ev[0][2]).toMatchObject({ page_path: "/contact", form_name: "contact" });
});
