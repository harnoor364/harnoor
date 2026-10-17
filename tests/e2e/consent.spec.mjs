/* Cookie consent: nothing optional before a choice, rejection blocks analytics,
   preferences work by keyboard, the choice persists and expires, and the banner
   never covers the WhatsApp button or the hero call-to-action on phones. */
import { test, expect } from "@playwright/test";
import fs from "node:fs";

// Pretend a GA4 ID is configured, so we can prove it is (or isn't) loaded.
async function withAnalyticsId(page) {
  await page.route("**/js/data.js", async (route) => {
    const res = await route.fetch();
    const body = (await res.text()).replace('analyticsId: ""', 'analyticsId: "G-TEST12345"');
    await route.fulfill({ response: res, body });
  });
}
const gaTags = (page) => page.locator('script[src*="googletagmanager.com/gtag/js"]').count();
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("uw_consent") || "null"));

test("first visit: banner shows, nothing optional is loaded or stored", async ({ page }) => {
  await withAnalyticsId(page);
  await page.goto("/");
  const banner = page.locator(".consent-banner");
  await expect(banner).toBeVisible();
  await expect(banner.locator("button")).toHaveText(["Accept all", "Reject non-essential", "Customise"]);
  expect(await gaTags(page)).toBe(0);
  expect(await stored(page)).toBeNull();
  expect(await page.evaluate(() => typeof window.gtag)).toBe("undefined");
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

test("Reject non-essential blocks analytics, now and after reload", async ({ page }) => {
  await withAnalyticsId(page);
  await page.goto("/");
  await page.click(".consent-banner >> text=Reject non-essential");
  await expect(page.locator(".consent-banner")).toHaveCount(0);
  expect(await stored(page)).toMatchObject({ v: 1, essential: true, analytics: false, marketing: false });
  expect(await gaTags(page)).toBe(0);
  await page.reload();
  await expect(page.locator(".consent-banner")).toHaveCount(0);
  expect(await gaTags(page)).toBe(0);
});

test("Accept all loads analytics with Consent Mode v2 (defaults denied, then granted)", async ({ page }) => {
  await withAnalyticsId(page);
  await page.route("https://www.googletagmanager.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
  await page.goto("/");
  expect(await gaTags(page)).toBe(0);
  await page.click(".consent-banner >> text=Accept all");
  expect(await gaTags(page)).toBe(1);
  const consent = await page.evaluate(() => window.dataLayer.filter((a) => a[0] === "consent").map((a) => [a[1], a[2]]));
  expect(consent[0][0]).toBe("default");
  expect(consent[0][1].analytics_storage).toBe("denied");
  expect(consent[1][0]).toBe("update");
  expect(consent[1][1].analytics_storage).toBe("granted");
});

test("Customise works with the keyboard; Esc changes nothing; saving analytics only", async ({ page }) => {
  await withAnalyticsId(page);
  await page.route("https://www.googletagmanager.com/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
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
  expect(await gaTags(page)).toBe(1);
  const update = await page.evaluate(() => window.dataLayer.filter((a) => a[0] === "consent" && a[1] === "update").pop()[2]);
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
  const code = ["js/main.js", "js/consent.js", "js/auth.js", "js/auth-state.js", "js/data.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
  expect(code).not.toMatch(/geolocation|Notification\.requestPermission|getUserMedia|navigator\.permissions|PushManager|getDisplayMedia/);
});
