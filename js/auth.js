/* =====================================================================
   CLIENT PORTAL — sign up, log in, password reset and /account.
   Uses Supabase Auth (no passwords are handled or stored by this site).
   Config comes from js/supabase-config.js (written at build time).
   All text from the server is inserted with textContent, never as HTML.
   ===================================================================== */
(function () {
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
    if (msg.includes("email_not_confirmed") || msg.includes("not confirmed")) return "Please verify your email first. Check your inbox for the link I sent you.";
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
      const { error } = await sb.auth.signUp({
        email, password,
        options: { data: { full_name: name, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: `${origin}/account` }
      });
      busy(btn, false);
      if (error) { say(status, friendly(error), "error"); return; }
      // Same message whether or not the address already had an account.
      form.hidden = true;
      const done = $("#signup-done");
      $("[data-email]", done).textContent = email;
      done.hidden = false;
      done.focus();
    });
  }

  /* ---------- Log in ---------- */
  if (page === "login") {
    const form = $("[data-auth-form]");
    const status = $(".form-status", form);
    const resend = $("[data-resend]");
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
        if (resend) resend.hidden = !/confirm/i.test(String(error.code || error.message));
        return;
      }
      location.assign("/account");
    });

    if (resend) {
      resend.addEventListener("click", async () => {
        const email = form.email.value.trim();
        if (!email) { say(status, "Type your email address above first.", "error"); return; }
        busy(resend, true, "Sending…");
        const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${origin}/account` } });
        busy(resend, false);
        say(status, error ? friendly(error) : "If that address is waiting for verification, a new link is on its way.", error ? "error" : "ok");
      });
    }
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
})();
