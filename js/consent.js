/* =====================================================================
   COOKIE CONSENT — banner + preferences (Essential / Analytics / Marketing)

   - Nothing optional loads before the visitor chooses. "Reject non-essential"
     and closing without choosing both mean: no analytics, no marketing.
   - The choice is saved for 6 months in localStorage ("uw_consent"), then
     the banner asks again. "Cookie settings" (footer) reopens it any time.
   - Google Analytics: put your GA4 ID in SITE.analyticsId (js/data.js).
     It is loaded ONLY after "Analytics" is allowed, with Google Consent
     Mode v2 defaults set to "denied" first. Adding it also needs the CSP
     changes listed in docs/COOKIES-AND-ANALYTICS.md.
   - Never asks for browser permissions (location, notifications, camera…).
   ===================================================================== */
(function () {
  "use strict";

  const KEY = "uw_consent";
  const VERSION = 1;
  const MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; // about 6 months
  const $ = (sel, root = document) => root.querySelector(sel);

  /* ---------- Stored choice ---------- */
  function read() {
    try {
      const c = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!c || c.v !== VERSION || !c.ts || Date.now() - c.ts > MAX_AGE_MS) return null;
      return { analytics: !!c.analytics, marketing: !!c.marketing };
    } catch (e) { return null; }
  }
  function save(choice) {
    const c = { v: VERSION, ts: Date.now(), essential: true, analytics: !!choice.analytics, marketing: !!choice.marketing };
    try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* storage blocked: choice lasts for this page only */ }
    apply(c);
    window.dispatchEvent(new CustomEvent("uw:consent", { detail: c }));
  }

  /* ---------- What each category switches on ---------- */
  let gaLoaded = false;
  function apply(c) {
    const site = typeof SITE !== "undefined" ? SITE : {};
    const id = /^G-[A-Z0-9]+$/.test(site.analyticsId || "") ? site.analyticsId : "";
    if (!id) return;                         // no analytics configured: nothing to load
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    const state = {
      analytics_storage: c.analytics ? "granted" : "denied",
      ad_storage: c.marketing ? "granted" : "denied",
      ad_user_data: c.marketing ? "granted" : "denied",
      ad_personalization: c.marketing ? "granted" : "denied"
    };
    if (!gaLoaded && c.analytics) {
      // Consent Mode v2: defaults first (all denied), then the visitor's choice, then load.
      gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", wait_for_update: 500 });
      gtag("consent", "update", state);
      gtag("js", new Date());
      gtag("config", id, { anonymize_ip: true });
      const s = document.createElement("script");
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      s.setAttribute("data-consent-category", "analytics");
      document.head.appendChild(s);
      gaLoaded = true;
    } else if (gaLoaded) {
      gtag("consent", "update", state);    // withdrawing consent stops collection on the next hit
    }
  }

  /* ---------- Banner ---------- */
  function banner() {
    const el = document.createElement("section");
    el.className = "consent-banner";
    el.setAttribute("aria-label", "Cookie choices");
    el.innerHTML = `
      <div class="container consent-inner">
        <p class="consent-text">This site only uses what it needs to work. Optional analytics and marketing cookies stay off unless you allow them. <a href="/cookie-policy">Cookie Policy</a></p>
        <div class="consent-actions">
          <button class="btn btn-consent" type="button" data-consent="all">Accept all</button>
          <button class="btn btn-consent" type="button" data-consent="essential">Reject non-essential</button>
          <button class="btn btn-consent" type="button" data-consent="customise">Customise</button>
        </div>
      </div>`;
    // Place it first in the page so keyboard users reach it straight after "Skip to content".
    const skip = $(".skip-link");
    (skip ? skip.after(el) : document.body.prepend(el));
    el.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-consent]");
      if (!btn) return;
      const what = btn.getAttribute("data-consent");
      if (what === "customise") { openPrefs(); return; }
      save({ analytics: what === "all", marketing: what === "all" });
      close();
    });
    return el;
  }
  let bannerEl = null;
  function close() { if (bannerEl) { bannerEl.remove(); bannerEl = null; } }

  /* ---------- Preferences dialog ---------- */
  let dialog = null;
  function prefsDialog() {
    const d = document.createElement("dialog");
    d.className = "consent-dialog";
    d.setAttribute("aria-labelledby", "consent-title");
    d.innerHTML = `
      <form method="dialog" class="consent-form">
        <h2 id="consent-title">Cookie settings</h2>
        <p class="muted small">Choose what this site may use. You can change this any time with “Cookie settings” at the bottom of every page.</p>
        <fieldset class="consent-cat">
          <legend class="visually-hidden">Categories</legend>
          <div class="consent-row">
            <input type="checkbox" id="c-essential" checked disabled>
            <label for="c-essential"><strong>Essential</strong> <span class="muted">(always on)</span><br><span class="small muted">Remembers this choice and keeps you logged in to your client account.</span></label>
          </div>
          <div class="consent-row">
            <input type="checkbox" id="c-analytics" name="analytics">
            <label for="c-analytics"><strong>Analytics</strong><br><span class="small muted">Counts visits and which pages are useful. Not in use yet; off unless you allow it.</span></label>
          </div>
          <div class="consent-row">
            <input type="checkbox" id="c-marketing" name="marketing">
            <label for="c-marketing"><strong>Marketing</strong><br><span class="small muted">Advertising and remarketing. Not used on this site; off unless you allow it.</span></label>
          </div>
        </fieldset>
        <div class="consent-actions">
          <button class="btn btn-consent" type="submit" value="save">Save my choices</button>
          <button class="btn btn-consent" type="submit" value="all">Accept all</button>
          <button class="btn btn-consent" type="submit" value="essential">Reject non-essential</button>
        </div>
      </form>`;
    document.body.appendChild(d);
    // Save as soon as a button is pressed (the dialog then closes itself).
    // Esc or closing without a button changes nothing.
    $("form", d).addEventListener("submit", (e) => {
      const v = e.submitter && e.submitter.value;
      if (v === "all") save({ analytics: true, marketing: true });
      else if (v === "essential") save({ analytics: false, marketing: false });
      else if (v === "save") save({ analytics: $("#c-analytics", d).checked, marketing: $("#c-marketing", d).checked });
      else return;
      close();
    });
    return d;
  }
  let opener = null;
  function openPrefs() {
    opener = document.activeElement;
    if (!dialog) dialog = prefsDialog();
    const c = read() || { analytics: false, marketing: false };
    $("#c-analytics", dialog).checked = c.analytics;
    $("#c-marketing", dialog).checked = c.marketing;
    dialog.returnValue = "";
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    dialog.addEventListener("close", () => { if (opener && document.contains(opener)) opener.focus(); }, { once: true });
  }

  /* ---------- Start ---------- */
  function start() {
    const c = read();
    if (c) apply(c);
    else bannerEl = banner();
    document.querySelectorAll("[data-cookie-settings]").forEach((b) => b.addEventListener("click", openPrefs));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
