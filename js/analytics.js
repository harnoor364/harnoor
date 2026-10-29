/* =====================================================================
   GOOGLE ANALYTICS 4 (gtag.js) with Google Consent Mode v2.
   Loaded in <head> on every page, after Secure Privacy and before the Google tag.

   - Default consent: everything "denied". GA then sets no cookies and
     stores no identifiers.
   - Consent updates (and remembering each visitor's choice) come from
     Secure Privacy, whose script loads first in <head>. This file never
     grants consent itself.
   - Events: whatsapp_click (links to wa.me / api.whatsapp.com),
     call_click (tel: links), generate_lead (sent by js/main.js after a
     successful contact form submission). Each carries page_path.
   - The address sent to Google never includes the part after "#", so
     login and password-reset links can't leak to analytics.
   ===================================================================== */
(function () {
  "use strict";

  var ID = "G-3D4ERRL2NK";

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

  // 2. The Google tag. (Secure Privacy sends gtag("consent", "update", …) itself.)
  gtag("js", new Date());
  gtag("config", ID, { page_location: location.origin + location.pathname + location.search });

  // 3. Click tracking for WhatsApp and phone links (works for links added later too).
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
