/* Client portal flows, tested against a fake Supabase server (page.route),
   so they run without a real Supabase project or real emails. */
import { test, expect } from "@playwright/test";

const SB = "https://testref.supabase.co";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.c2ln`;
const ANON = jwt({ role: "anon", iss: "supabase", ref: "testref" });
const USER = { id: "11111111-1111-1111-1111-111111111111", aud: "authenticated", role: "authenticated", email: "dr.a@example.com",
  email_confirmed_at: "2026-10-01T10:00:00Z", user_metadata: { full_name: "Dr A" }, app_metadata: { provider: "email" }, identities: [] };
const now = () => Math.floor(Date.now() / 1000);
const ACCESS = () => jwt({ sub: USER.id, role: "authenticated", aud: "authenticated", email: USER.email, exp: now() + 3600, iat: now(), session_id: "s1" });
const session = () => ({ access_token: ACCESS(), refresh_token: "r1", token_type: "bearer", expires_in: 3600, expires_at: now() + 3600, user: USER });
const PROJECT = { client_name: "Dr A", project_name: "Clinic website", status: "Designing", notes: "Homepage draft sent.\n<b>not bold</b>", updated_at: "2026-10-15T09:00:00Z" };

async function fakeSupabase(page, calls = []) {
  await page.route("**/js/supabase-config.js*", (r) =>
    r.fulfill({ contentType: "text/javascript", body: `window.SUPABASE_CONFIG = ${JSON.stringify({ url: SB, anonKey: ANON })};` }));
  await page.route(`${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const body = req.postDataJSON ? (() => { try { return req.postDataJSON(); } catch { return null; } })() : null;
    calls.push({ method: req.method(), path: url.pathname, query: url.search, body });
    const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*", "access-control-expose-headers": "*" };
    const json = (status, data) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(data) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname === "/auth/v1/signup") return json(200, { ...USER, email: body.email, email_confirmed_at: null, user_metadata: body.data });
    if (url.pathname === "/auth/v1/token" && url.searchParams.get("grant_type") === "password") {
      if (body.password === "wrong-password") return json(400, { code: "invalid_credentials", error_code: "invalid_credentials", msg: "Invalid login credentials" });
      if (body.email.startsWith("unverified")) return json(400, { code: "email_not_confirmed", error_code: "email_not_confirmed", msg: "Email not confirmed" });
      return json(200, session());
    }
    if (url.pathname === "/auth/v1/token") return json(200, session());
    if (url.pathname === "/auth/v1/user" && req.method() === "GET") return json(200, USER);
    if (url.pathname === "/auth/v1/user" && req.method() === "PUT") return json(200, USER);
    if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204, headers: CORS });
    if (url.pathname === "/auth/v1/recover") return json(200, {});
    if (url.pathname === "/auth/v1/resend") return json(200, {});
    if (url.pathname === "/rest/v1/client_projects") {
      const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
      return json(200, single ? PROJECT : [PROJECT]);
    }
    return json(404, { msg: "not mocked" });
  });
}

test("portal pages say login is off when Supabase isn't configured", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.locator("[data-portal-off]")).toBeVisible();
  await expect(page.locator("[data-auth-form] button[type=submit]")).toBeDisabled();
});

test("show/hide password toggle", async ({ page }) => {
  await page.goto("/login");
  const input = page.locator("#password");
  const toggle = page.locator("[data-toggle-password]");
  await expect(input).toHaveAttribute("type", "password");
  await toggle.click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(input).toHaveAttribute("type", "password");
});

test("sign up requires the terms box, then asks to verify email", async ({ page }) => {
  const calls = [];
  await fakeSupabase(page, calls);
  await page.goto("/signup");
  await expect(page.locator("#terms")).not.toBeChecked();
  await page.fill("#full_name", "Dr A");
  await page.fill("#email", "dr.a@example.com");
  await page.fill("#password", "a-good-password");
  await page.click("[data-auth-form] button[type=submit]");
  expect(calls.some((c) => c.path === "/auth/v1/signup")).toBe(false);          // blocked without consent
  await page.click("[data-google]");
  await expect(page.locator(".form-status")).toContainText("Terms of Service");
  await page.check("#terms");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator("#signup-done")).toBeVisible();
  await expect(page.locator("#signup-done [data-email]")).toHaveText("dr.a@example.com");
  const signup = calls.find((c) => c.path === "/auth/v1/signup");
  expect(signup.body.data.full_name).toBe("Dr A");
  expect(signup.body.data.terms_accepted_at).toBeTruthy();
});

test("login errors are plain English; unverified email offers a new link", async ({ page }) => {
  const calls = [];
  await fakeSupabase(page, calls);
  await page.goto("/login");
  await page.fill("#email", "dr.a@example.com");
  await page.fill("#password", "wrong-password");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator(".form-status")).toContainText("don't match");
  await expect(page.locator("[data-resend]")).toBeHidden();
  await page.fill("#email", "unverified@example.com");
  await page.fill("#password", "a-good-password");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator(".form-status")).toContainText("verify your email");
  await page.click("[data-resend]");
  await expect(page.locator(".form-status")).toContainText("new link");
  expect(calls.some((c) => c.path === "/auth/v1/resend")).toBe(true);
});

test("log in → account shows the project → log out", async ({ page }) => {
  await fakeSupabase(page);
  await page.goto("/login");
  await page.fill("#email", "dr.a@example.com");
  await page.fill("#password", "a-good-password");
  await page.click("[data-auth-form] button[type=submit]");
  await page.waitForURL("**/account");
  await expect(page.locator("[data-client-name]")).toHaveText("Dr A");
  await expect(page.locator("[data-project-name]")).toHaveText("Clinic website");
  await expect(page.locator("[data-project-status]")).toHaveText("Designing");
  await expect(page.locator(".status-steps li.current")).toHaveText("Designing");
  await expect(page.locator("[data-project-notes]")).toContainText("<b>not bold</b>");   // shown as text
  await expect(page.locator(".site-header [data-account-link]")).toHaveText("My account");
  await page.click("[data-logout]");
  await page.waitForURL("**/login?loggedout=1");
  await expect(page.locator(".site-header [data-account-link]")).toHaveText("Log in");
  const keys = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("sb-")));
  expect(keys).toEqual([]);
});

test("account page sends logged-out visitors to login", async ({ page }) => {
  await fakeSupabase(page);
  await page.goto("/account");
  await page.waitForURL("**/login", { timeout: 5000 });
});

test("forgot password never reveals whether an account exists", async ({ page }) => {
  const calls = [];
  await fakeSupabase(page, calls);
  await page.goto("/forgot-password");
  await page.fill("#email", "someone@example.com");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator(".form-status")).toContainText("If there's an account");
  const rec = calls.find((c) => c.path === "/auth/v1/recover");
  expect(rec.query).toContain("redirect_to=");
});

test("reset password from the email link", async ({ page }) => {
  const calls = [];
  await fakeSupabase(page, calls);
  await page.goto(`/reset-password#access_token=${ACCESS()}&refresh_token=r1&expires_in=3600&expires_at=${now() + 3600}&token_type=bearer&type=recovery`);
  await expect(page.locator("[data-auth-form]")).toBeVisible();
  await page.fill("#password", "new-password-1");
  await page.fill("#confirm", "new-password-2");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator(".form-status")).toContainText("don't match");
  await page.fill("#confirm", "new-password-1");
  await page.click("[data-auth-form] button[type=submit]");
  await page.waitForURL("**/login?reset=1");
  await expect(page.locator(".form-status")).toContainText("password has been changed");
  expect(calls.some((c) => c.path === "/auth/v1/user" && c.method === "PUT")).toBe(true);
});

test("an expired reset link says so", async ({ page }) => {
  await fakeSupabase(page);
  await page.goto("/reset-password");
  await expect(page.locator("[data-link-invalid]")).toBeVisible({ timeout: 4000 });
});
