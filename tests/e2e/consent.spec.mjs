/* Consent (Secure Privacy) + Google Analytics (GA4, Consent Mode v2):
   Secure Privacy's script is the first script in <head>, then the Consent
   Mode defaults (all denied), then the Google tag. The site itself never
   grants consent (Secure Privacy sends the updates). The old custom banner
   is gone, "Cookie settings" reopens Secure Privacy, and the GA4 events fire. */
import { test, expect } from "@playwright/test";
import fs from "node:fs";

const SP = "https://app.secureprivacy.ai/script/6ae342a084533a312ef42b66.js";
// Never contact Google or Secure Privacy from tests. `spScript` lets a test stand in for Secure Privacy.
async function stubThirdParties(page, spScript = "") {
  await page.route(/https:\/\/([a-z0-9-]+\.)*(googletagmanager|google-analytics|analytics\.google)\.com\//, (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.route(/https:\/\/([a-z0-9-]+\.)*secureprivacy\.ai\//, (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: spScript }));
}

const layer = (page) => page.evaluate(() => (window.dataLayer || []).map((a) => Array.from(a).map((x) => (x instanceof Date ? "date" : x))));
const consentCalls = async (page) => (await layer(page)).filter((a) => a[0] === "consent");
const events = async (page, name) => (await layer(page)).filter((a) => a[0] === "event" && a[1] === name);
const gaCookies = async (page) => (await page.context().cookies()).filter((c) => c.name.startsWith("_ga"));
const DENIED = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };

test.describe("with Secure Privacy and Google stubbed", () => {
  test.beforeEach(async ({ page }) => { await stubThirdParties(page); });

  for (const path of ["/", "/contact", "/login", "/cookie-policy", "/404.html"]) {
    test(`${path}: Secure Privacy first, then Consent Mode defaults, then the Google tag`, async ({ page }) => {
      await page.goto(path);
      const order = await page.evaluate(() => Array.from(document.head.querySelectorAll("script[src]")).map((s) => s.getAttribute("src")).slice(0, 3));
      expect(order).toEqual([SP, "/js/analytics.js", "https://www.googletagmanager.com/gtag/js?id=G-3D4ERRL2NK"]);
      expect(await page.locator('script[src*="secureprivacy"]').count()).toBe(1);
    });
  }

  test("all consent types default to denied and the site never grants consent itself", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("uw_consent", JSON.stringify({ v: 1, ts: Date.now(), essential: true, analytics: true, marketing: true })));
    await page.reload();                                   // an old saved "accept" must not grant anything now
    const consent = await consentCalls(page);
    expect(consent).toHaveLength(1);
    expect(consent[0][1]).toBe("default");
    expect(consent[0][2]).toMatchObject(DENIED);
    const cfg = (await layer(page)).find((a) => a[0] === "config");
    expect(cfg[1]).toBe("G-3D4ERRL2NK");
    expect(cfg[2].page_location).toBe(new URL(page.url()).origin + "/");
    expect(await gaCookies(page)).toEqual([]);
  });

  test("the old custom banner and its preferences dialog are gone", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(300);
    await expect(page.locator(".consent-banner, dialog.consent-dialog, [data-consent]")).toHaveCount(0);
    expect(fs.existsSync("js/consent.js")).toBe(false);
    expect(fs.readFileSync("css/style.css", "utf8")).not.toMatch(/consent-(banner|dialog)/);
  });

  test("without Secure Privacy loaded, footer Cookie settings opens the Cookie Policy", async ({ page }) => {
    await page.goto("/pricing");
    const link = page.locator(".site-footer [data-cookie-settings]");
    await expect(link).toHaveText("Cookie settings");
    await link.click();
    await page.waitForURL("**/cookie-policy#your-choice");
  });

  test("the site never asks for browser permissions", async () => {
  const code = ["js/main.js", "js/analytics.js", "js/cookie-settings.js", "js/auth.js", "js/auth-state.js", "js/data.js"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
  expect(code).not.toMatch(/geolocation|Notification\.requestPermission|getUserMedia|navigator\.permissions|PushManager|getDisplayMedia/);
});

  const stopNavigation = (page) => page.evaluate(() => document.addEventListener("click", (e) => e.preventDefault()));
  
  test("a click on a WhatsApp link sends whatsapp_click with the page path", async ({ page }) => {
    await page.goto("/pricing");
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
});

test("footer and Cookie Policy 'Cookie settings' reopen Secure Privacy's preferences", async ({ page }) => {
  await stubThirdParties(page, "window.sp = { showPreferences() { window.__spOpened = (window.__spOpened || 0) + 1; } };");
  await page.goto("/cookie-policy");
  await page.locator(".site-footer [data-cookie-settings]").click();
  await page.locator("article [data-cookie-settings]").first().click();
  expect(await page.evaluate(() => window.__spOpened)).toBe(2);
  expect(new URL(page.url()).pathname).toBe("/cookie-policy");
});
