/* Client portal flows, tested against a fake Supabase server (page.route),
   so they run without a real Supabase project or real emails. */
import { test, expect } from "@playwright/test";

// Never contact Google or Secure Privacy from tests: answer their scripts and hits with empty responses.
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/([a-z0-9-]+\.)*((googletagmanager|google-analytics|analytics\.google)\.com|secureprivacy\.ai)\//, (r) =>
    r.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
});

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

async function fakeSupabase(page, calls = [], { autoConfirm = false, content = null, contentStatus = 200, admin = false } = {}) {
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
    if (url.pathname === "/auth/v1/signup") return json(200, autoConfirm ? session() : { ...USER, email: body.email, email_confirmed_at: null, user_metadata: body.data });
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
    if (url.pathname === "/auth/v1/verify") {
      if (body && body.token === "123456" && body.email) return json(200, session());
      return json(403, { code: "otp_expired", error_code: "otp_expired", msg: "Token has expired or is invalid" });
    }
    if (url.pathname === "/rest/v1/client_projects") {
      if (req.method() === "PATCH") return json(200, [{ user_id: USER.id }]);
      const single = /vnd\.pgrst\.object/.test(req.headers()["accept"] || "");
      return json(200, single ? PROJECT : [{ ...PROJECT, user_id: USER.id }]);
    }
    if (url.pathname === "/rest/v1/site_content") {
      if (req.method() === "POST") return json(201, []);
      if (contentStatus !== 200) return json(contentStatus, { message: "down" });
      return json(200, content || []);
    }
    if (url.pathname === "/rest/v1/rpc/is_admin") return json(200, admin);
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
  expect(await page.locator("#terms").evaluate((el) => el.validity.valueMissing)).toBe(true);   // browser asks for the box
  await page.check("#terms");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator("#signup-done")).toBeVisible();
  await expect(page.locator("#signup-done [data-email]")).toHaveText("dr.a@example.com");
  const signup = calls.find((c) => c.path === "/auth/v1/signup");
  expect(signup.body.data.full_name).toBe("Dr A");
  expect(signup.body.data.terms_accepted_at).toBeTruthy();
});

test("login errors are plain English; unverified email can be verified with the code", async ({ page }) => {
  const calls = [];
  await fakeSupabase(page, calls);
  await page.goto("/login");
  await page.fill("#email", "dr.a@example.com");
  await page.fill("#password", "wrong-password");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator("[data-auth-form] .form-status")).toContainText("don't match");
  await expect(page.locator("#login-verify")).toBeHidden();
  await page.fill("#email", "unverified@example.com");
  await page.fill("#password", "a-good-password");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator("[data-auth-form] .form-status")).toContainText("verify your email");
  await expect(page.locator("#login-verify")).toBeVisible();
  await page.click("#login-verify [data-resend-code]");
  await expect(page.locator("#login-verify .form-status")).toContainText("new code");
  expect(calls.some((c) => c.path === "/auth/v1/resend")).toBe(true);
  await page.fill("#code", "123456");
  await page.click("#login-verify button[type=submit]");
  await page.waitForURL("**/account");
  const v = calls.find((c) => c.path === "/auth/v1/verify");
  expect(v.body).toMatchObject({ email: "unverified@example.com", token: "123456", type: "email" });
});

test("after sign-up, the emailed code verifies the account on the website", async ({ page }) => {
  await fakeSupabase(page);
  await page.goto("/signup");
  await page.fill("#full_name", "Dr A");
  await page.fill("#email", "dr.a@example.com");
  await page.fill("#password", "a-good-password");
  await page.check("#terms");
  await page.click("[data-auth-form] button[type=submit]");
  await expect(page.locator("#signup-done")).toBeVisible();
  await page.fill("#code", "12ab");
  await page.click("#signup-done button[type=submit]");
  await expect(page.locator("#signup-done .form-status")).toContainText("numbers only");
  await page.fill("#code", "999999");
  await page.click("#signup-done button[type=submit]");
  await expect(page.locator("#signup-done .form-status")).toContainText("wrong or has expired");
  await page.fill("#code", "123 456");
  await page.click("#signup-done button[type=submit]");
  await page.waitForURL("**/account");
  await expect(page.locator("[data-project-name]")).toHaveText("Clinic website");
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
  await expect(page.locator("[data-auth-form] .form-status")).toContainText("If there's an account");
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
  await expect(page.locator("[data-auth-form] .form-status")).toContainText("don't match");
  await page.fill("#confirm", "new-password-1");
  await page.click("[data-auth-form] button[type=submit]");
  await page.waitForURL("**/login?reset=1");
  await expect(page.locator("[data-auth-form] .form-status")).toContainText("password has been changed");
  expect(calls.some((c) => c.path === "/auth/v1/user" && c.method === "PUT")).toBe(true);
});

test("an expired reset link says so", async ({ page }) => {
  await fakeSupabase(page);
  await page.goto("/reset-password");
  await expect(page.locator("[data-link-invalid]")).toBeVisible({ timeout: 4000 });
});

test("an old cached empty config is replaced by a fresh one, so the forms work", async ({ page }) => {
  await fakeSupabase(page);
  let n = 0;
  await page.route("**/js/supabase-config.js*", (r) => {
    n += 1;
    const cfg = n === 1 ? { url: "", anonKey: "" } : { url: SB, anonKey: ANON };   // 1st = stale cached copy
    return r.fulfill({ contentType: "text/javascript", body: `window.SUPABASE_CONFIG = ${JSON.stringify(cfg)};` });
  });
  await page.goto("/login");
  await expect(page.locator("[data-auth-form] button[type=submit]")).toBeEnabled();
  await expect(page.locator("[data-portal-off]")).toBeHidden();
  expect(n).toBe(2);
});

test("there is no Continue with Google button on the login and sign-up pages", async ({ page }) => {
  await fakeSupabase(page);
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await expect(page.locator("[data-auth-form] button[type=submit]")).toBeEnabled();
    await expect(page.getByText("Continue with Google")).toHaveCount(0);
  }
});

test("with email verification switched off, sign-up goes straight to the account", async ({ page }) => {
  await fakeSupabase(page, [], { autoConfirm: true });
  await page.goto("/signup");
  await page.fill("#full_name", "Dr A");
  await page.fill("#email", "dr.a@example.com");
  await page.fill("#password", "a-good-password");
  await page.check("#terms");
  await page.click("[data-auth-form] button[type=submit]");
  await page.waitForURL("**/account");
  await expect(page.locator("[data-project-name]")).toHaveText("Clinic website");
});

/* ---------- Editable content (admin panel → site_content) ---------- */
const EDITED = [
  { key: "site", value: { phoneDisplay: "+91 90000 00001", whatsapp: "919000000001", email: "new@example.com", location: "Ludhiana", defaultWhatsAppMessage: "Hello!" } },
  { key: "projects", value: [{ title: "Edited Project <b>x</b>", category: "Bakery", location: "Ludhiana", description: "From the admin panel.", image: "images/projects/ebook-store.svg", url: "", tags: ["Online Orders"], featured: true, note: "" }] },
  { key: "packages", value: [{ name: "Starter", price: "₹7,777", priceNote: "one-time", tagline: "Edited.", features: ["One page"], popular: true }] }
];

test("pages show content edited in the admin panel (text stays text)", async ({ page }) => {
  await fakeSupabase(page, [], { content: EDITED });
  await page.goto("/");
  await expect(page.locator(".site-footer [data-site=\"phone-text\"]").first()).toHaveText("+91 90000 00001");
  await expect(page.getByText("Edited Project <b>x</b>").first()).toBeVisible();      // shown as text, not HTML
  await expect(page.locator('a[data-wa]').first()).toHaveAttribute("href", /wa\.me\/919000000001/);
  await page.goto("/pricing");
  await expect(page.getByText("₹7,777").first()).toBeVisible();
});

test("if the content database is down, the built-in content stays", async ({ page }) => {
  await fakeSupabase(page, [], { contentStatus: 503 });
  await page.goto("/portfolio");
  await expect(page.getByText("Grace Unisex Salon").first()).toBeVisible();
  await expect(page.locator(".site-footer [data-site=\"phone-text\"]").first()).toHaveText("+91 79733 53244");
});

test("admin: a signed-in client who isn't an admin is refused", async ({ page }) => {
  await fakeSupabase(page, [], { admin: false });
  await page.goto("/admin");
  await page.fill("#a-email", "dr.a@example.com");
  await page.fill("#a-password", "a-good-password");
  await page.click("[data-admin-login-form] button[type=submit]");
  await expect(page.locator("[data-admin-denied]")).toBeVisible();
  await expect(page.locator("[data-admin-app]")).toBeHidden();
});

test("admin: sign in, edit business details and the portfolio, update a client", async ({ page }) => {
  const calls = [];
  await fakeSupabase(page, calls, { admin: true, content: EDITED });
  await page.goto("/admin");
  await expect(page.locator("[data-admin-login]")).toBeVisible();
  await page.fill("#a-email", "dr.a@example.com");
  await page.fill("#a-password", "a-good-password");
  await page.click("[data-admin-login-form] button[type=submit]");
  await expect(page.locator("[data-admin-app]")).toBeVisible();
  await expect(page.locator("[data-admin-email]")).toHaveText("dr.a@example.com");

  // Business details
  await expect(page.locator("#site-phoneDisplay")).toHaveValue("+91 90000 00001");
  await page.fill("#site-phoneDisplay", "+91 98888 77777");
  await page.click("text=Save business details");
  await expect(page.locator("#panel-site .form-status")).toContainText("Saved");
  let post = calls.filter((c) => c.path === "/rest/v1/site_content" && c.method === "POST").pop();
  expect(post.body).toMatchObject({ key: "site", value: { phoneDisplay: "+91 98888 77777", whatsapp: "919000000001" } });

  // Portfolio: add a project, a required field is checked, then save
  await page.click("#tab-projects");
  await page.click("text=Add a project");
  await page.click("text=Save portfolio");
  await expect(page.locator("#panel-projects > .form-status")).toContainText("missing a required field");
  await page.fill("#projects-1-title", "New Bakery Site");
  await page.fill("#projects-1-tags", "Online Orders\nWhatsApp");
  await page.click("text=Save portfolio");
  await expect(page.locator("#panel-projects > .form-status")).toContainText("Saved");
  post = calls.filter((c) => c.path === "/rest/v1/site_content" && c.method === "POST").pop();
  expect(post.body.key).toBe("projects");
  expect(post.body.value.map((p) => p.title)).toEqual(["Edited Project <b>x</b>", "New Bakery Site"]);
  expect(post.body.value[1].tags).toEqual(["Online Orders", "WhatsApp"]);

  // Client projects
  await page.click("#tab-clients");
  await page.fill("#c-name-0", "Clinic website v2");
  await page.selectOption("#c-status-0", "In review");
  await page.click("#panel-clients button[type=submit]");
  await expect(page.locator("#panel-clients .admin-client .form-status")).toContainText("Saved");
  const patch = calls.find((c) => c.path === "/rest/v1/client_projects" && c.method === "PATCH");
  expect(patch.body).toMatchObject({ project_name: "Clinic website v2", status: "In review" });
  expect(patch.query).toContain("user_id=eq.");
});
