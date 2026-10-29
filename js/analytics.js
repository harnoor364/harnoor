/* =====================================================================
   GOOGLE ANALYTICS 4 (gtag.js) with Google Consent Mode v2.
   Loaded first in <head> on every page, before the Google tag itself.

   - Default consent: everything "denied". GA then sets no cookies and
     stores no identifiers.
   - A returning visitor who already accepted Analytics (saved by
     js/consent.js as "uw_consent", kept about 6 months) is switched to
     "granted" straight away, so they are counted without the banner.
     Visitors who declined stay "denied".
   - Accepting in the banner later calls gtag('consent','update', …) from
     js/consent.js.
   - Events: whatsapp_click (links to wa.me / api.whatsapp.com),
     call_click (tel: links), generate_lead (sent by js/main.js after a
     successful contact form submission). Each carries page_path.
   - The address sent to Google never includes the part after "#", so
     login and password-reset links can't leak to analytics.
   ===================================================================== */
(function () {
  "use strict";

  var ID = "G-3D4ERRL2NK";
  var CONSENT_KEY = "uw_consent";
  var CONSENT_VERSION = 1;
  var MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000; // same 6 months as js/consent.js

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // 1. Consent Mode v2 defaults, before the Google tag loads.
  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500
  });

  // 2. Returning visitor: reuse the saved choice.
  try {
    var c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
    if (c && c.v === CONSENT_VERSION && c.ts && Date.now() - c.ts <= MAX_AGE_MS && c.analytics) {
      gtag("consent", "update", { analytics_storage: "granted" });
    }
  } catch (e) { /* storage blocked: stay denied */ }

  // 3. The Google tag.
  gtag("js", new Date());
  gtag("config", ID, { page_location: location.origin + location.pathname + location.search });

  // 4. Click tracking for WhatsApp and phone links (works for links added later too).
  function track(name, params) {
    var p = { page_path: location.pathname };
    for (var k in params || {}) p[k] = params[k];
    gtag("event", name, p);
  }
  window.uwTrack = track;

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.protocol === "tel:") track("call_click");
    else if (/^(wa\.me|api\.whatsapp\.com)$/i.test(url.hostname)) track("whatsapp_click");
  }, true);
})();
