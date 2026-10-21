/* =====================================================================
   CLIENT PORTAL — sign up, log in, password reset and /account.
   Uses Supabase Auth (no passwords are handled or stored by this site).
   Config comes from js/supabase-config.js (written at build time).
   All text from the server is inserted with textContent, never as HTML.
   ===================================================================== */
function uwAuthMain() {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const page = document.body.getAttribute("data-page");
  const cfg = window.SUPABASE_CONFIG || {};
  const origin = window.location.origin;
  const STATUSES = ["Not started", "Designing", "In review", "Live"];

  /* ---------- Show / hide password (works even if login isn't configured) ---------- */
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    const input = document.getElementById(btn.getAttribute("aria-controls"));
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.textContent = show ? "Hide" : "Show";
    });
  });

  /* ---------- Messages ---------- */
  function say(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = `form-status${kind ? " " + kind : ""}`;
  }

  // Turn Supabase errors into plain English. Login errors never reveal
  // whether an email address has an account.
  function friendly(err) {
    const msg = String((err && (err.code || err.message)) || "").toLowerCase();
    if (msg.includes("email_not_confirmed") || msg.includes("not confirmed")) return "Please verify your email first: type the code from the email I sent you.";
    if (msg.includes("invalid_credentials") || msg.includes("invalid login")) return "That email and password don't match. Check them and try again, or reset your password.";
    if (msg.includes("weak_password") || msg.includes("at least") || msg.includes("password should")) return "Please choose a stronger password: at least 8 characters.";
    if (msg.includes("same_password") || msg.includes("different from the old")) return "Your new password must be different from your old one.";
    if (msg.includes("rate") || msg.includes("too many") || msg.includes("over_email_send_rate_limit")) return "Too many attempts. Please wait a minute and try again.";
    if (msg.includes("expired") || msg.includes("otp") || msg.includes("invalid_grant")) return "This link has expired or was already used. Please request a new one.";
    if (msg.includes("failed to fetch") || msg.includes("network")) return "Can't reach the login service. Check your internet connection and try again.";
    return "Something went wrong. Please try again, or message me on WhatsApp.";
  }

  const busy = (btn, on, label) => {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || "Please wait…"; btn.disabled = true; }
    else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; }
  };

  /* ---------- Not configured yet ---------- */
  const configured = cfg.url && cfg.anonKey && window.supabase && typeof window.supabase.createClient === "function";
  if (!configured) {
    document.querySelectorAll("[data-auth-form] button[type=submit], [data-google]").forEach((b) => (b.disabled = true));
    const box = $("[data-portal-off]");
    if (box) box.hidden = false;
    if (page === "account") { const loading = $("[data-account-loading]"); if (loading) loading.hidden = true; }
    return;
  }

  const sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
  });

  /* Show "Continue with Google" only when Google sign-in is switched on in
     Supabase, so visitors never land on a "provider is not enabled" error. */
  fetch(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.anonKey } })
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => { if (s && s.external && s.external.google) document.querySelectorAll("[data-google-block]").forEach((el) => (el.hidden = false)); })
    .catch(() => {});

  /* ---------- Continue with Google ---------- */
  document.querySelectorAll("[data-google]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const status = $(".form-status", btn.closest("[data-auth-card]") || document);
      const terms = $("#terms");
      if (terms && !terms.checked) {
        say(status, "Please tick the box to agree to the Terms of Service and Privacy Policy first.", "error");
        terms.focus();
        return;
      }
      busy(btn, true, "Opening Google…");
      const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/account` } });
      if (error) { busy(btn, false); say(status, friendly(error), "error"); }
    });
  });

  /* ---------- Sign up ---------- */
  /* ---------- Verify the email with the code from the email (no link needed) ---------- */
  function wireVerify(form, getEmail) {
    if (!form) return;
    const status = $(".form-status", form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = getEmail();
      const code = form.code.value.replace(/\s+/g, "");
      if (!email) { say(status, "Type your email address above first.", "error"); return; }
      if (!/^\d{6,10}$/.test(code)) { say(status, "Please type the code from the email (numbers only).", "error"); return; }
      const btn = $("button[type=submit]", form);
      busy(btn, true, "Checking…");
      const { error } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
      busy(btn, false);
      if (error) {
        const tooMany = /rate|too many/i.test(String(error.code || error.message));
        say(status, tooMany ? friendly(error) : "That code is wrong or has expired. Check it, or tap \"Send a new code\".", "error");
        return;
      }
      location.assign("/account");
    });
    const again = $("[data-resend-code]", form);
    if (again) again.addEventListener("click", async () => {
      const email = getEmail();
      if (!email) { say(status, "Type your email address above first.", "error"); return; }
      busy(again, true, "Sending…");
      const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${origin}/account` } });
      busy(again, false);
      say(status, error ? friendly(error) : "A new code is on its way. Check your inbox (and spam folder).", error ? "error" : "ok");
    });
  }

  if (page === "signup") {
    const form = $("[data-auth-form]");
    const status = $(".form-status", form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const name = form.full_name.value.trim();
      const email = form.email.value.trim();
      const password = form.password.value;
      if (!$("#terms").checked) { say(status, "Please tick the box to agree to the Terms of Service and Privacy Policy.", "error"); return; }
      const btn = $("button[type=submit]", form);
      busy(btn, true, "Creating your account…");
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { full_name: name, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: `${origin}/account` }
      });
      busy(btn, false);
      if (error) { say(status, friendly(error), "error"); return; }
      // Email verification switched off in Supabase: the account is ready, go straight in.
      if (data && data.session) { location.assign("/account"); return; }
      // Same message whether or not the address already had an account.
      form.hidden = true;
      const done = $("#signup-done");
      $("[data-email]", done).textContent = email;
      done.hidden = false;
      done.focus();
    });
    wireVerify($("#signup-done [data-verify-form]"), () => form.email.value.trim());
  }

  /* ---------- Log in ---------- */
  if (page === "login") {
    const form = $("[data-auth-form]");
    const status = $(".form-status", form);
    const params = new URLSearchParams(location.search);
    if (params.has("reset")) say(status, "Your password has been changed. Log in with your new password.", "ok");
    if (params.has("loggedout")) say(status, "You've been logged out.", "ok");

    sb.auth.getSession().then(({ data }) => { if (data.session) location.replace("/account"); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const btn = $("button[type=submit]", form);
      busy(btn, true, "Logging in…");
      const { error } = await sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value });
      busy(btn, false);
      if (error) {
        say(status, friendly(error), "error");
        const box = $("#login-verify");
        if (box && /confirm/i.test(String(error.code || error.message))) { box.hidden = false; $("#code", box).focus(); }
        return;
      }
      location.assign("/account");
    });

    wireVerify($("#login-verify [data-verify-form]"), () => form.email.value.trim());
  }

  /* ---------- Forgot password ---------- */
  if (page === "forgot-password") {
    const form = $("[data-auth-form]");
    const status = $(".form-status", form);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const btn = $("button[type=submit]", form);
      busy(btn, true, "Sending…");
      const { error } = await sb.auth.resetPasswordForEmail(form.email.value.trim(), { redirectTo: `${origin}/reset-password` });
      busy(btn, false);
      // Never say whether the address has an account.
      if (error && /rate|too many/i.test(String(error.message))) { say(status, friendly(error), "error"); return; }
      say(status, "If there's an account for that address, a reset link is on its way. Check your inbox (and spam folder).", "ok");
      form.reset();
    });
  }

  /* ---------- Reset password (arrives from the email link) ---------- */
  if (page === "reset-password") {
    const form = $("[data-auth-form]");
    const status = $(".form-status", form);
    const invalid = $("[data-link-invalid]");
    let ready = false;
    const showForm = () => { ready = true; form.hidden = false; if (invalid) invalid.hidden = true; };
    sb.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY" || session) showForm(); });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) showForm();
      else setTimeout(() => { if (!ready && invalid) invalid.hidden = false; }, 1500);
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (form.password.value !== form.confirm.value) { say(status, "The two passwords don't match.", "error"); return; }
      const btn = $("button[type=submit]", form);
      busy(btn, true, "Saving…");
      const { error } = await sb.auth.updateUser({ password: form.password.value });
      busy(btn, false);
      if (error) { say(status, friendly(error), "error"); return; }
      await sb.auth.signOut();
      location.assign("/login?reset=1");
    });
  }

  /* ---------- My account ---------- */
  if (page === "account") {
    const loading = $("[data-account-loading]");
    const show = async (session) => {
      const user = session.user;
      const { data, error } = await sb.from("client_projects")
        .select("client_name, project_name, status, notes, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      loading.hidden = true;
      document.querySelectorAll("[data-account]").forEach((el) => (el.hidden = false));
      const meta = user.user_metadata || {};
      $("[data-client-name]").textContent = (data && data.client_name) || meta.full_name || meta.name || user.email;
      $("[data-client-email]").textContent = user.email || "";
      if (error) { $("[data-project-error]").hidden = false; return; }
      if (!data || !data.project_name) { $("[data-no-project]").hidden = false; return; }
      $("[data-project]").hidden = false;
      $("[data-project-name]").textContent = data.project_name;
      const current = STATUSES.indexOf(data.status);
      document.querySelectorAll("[data-status-step]").forEach((li, i) => {
        li.classList.toggle("done", current > -1 && i < current);
        li.classList.toggle("current", i === current);
        if (i === current) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
      });
      $("[data-project-status]").textContent = current > -1 ? data.status : "Not started";
      $("[data-project-notes]").textContent = data.notes || "No notes yet.";
      if (data.updated_at) {
        $("[data-updated]").textContent = new Date(data.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
      }
    };
    let shown = false;
    sb.auth.onAuthStateChange((event, session) => { if (session && !shown) { shown = true; show(session); } });
    sb.auth.getSession().then(({ data }) => {
      if (data.session) { if (!shown) { shown = true; show(data.session); } }
      // Give an email-verification or Google redirect a moment to finish signing in.
      else setTimeout(() => { if (!shown) location.replace("/login"); }, 1200);
    });
    $("[data-logout]").addEventListener("click", async (e) => {
      busy(e.currentTarget, true, "Logging out…");
      await sb.auth.signOut();
      location.assign("/login?loggedout=1");
    });
  }
}

/* If the login settings look empty, the browser may be holding an old saved
   copy of js/supabase-config.js. Fetch a fresh copy once before giving up. */
(function boot() {
  "use strict";
  const c = window.SUPABASE_CONFIG || {};
  if (c.url && c.anonKey) return uwAuthMain();
  const s = document.createElement("script");
  s.src = `js/supabase-config.js?fresh=${Date.now()}`;
  s.onload = s.onerror = () => uwAuthMain();
  document.head.appendChild(s);
})();
