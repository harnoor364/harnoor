/* =====================================================================
   "Cookie settings" links (footer and Cookie Policy page).
   Consent itself is handled by Secure Privacy (loaded first in <head>).
   A click reopens Secure Privacy's preference center.

   OPEN_PREFERENCES lists the Secure Privacy functions tried, in order.
   If your Secure Privacy dashboard (Widgets → Hyperlink) shows a different
   call, put it first in this list. If none is available (for example the
   script was blocked), the link opens the Cookie Policy page instead.
   ===================================================================== */
(function () {
  "use strict";

  var OPEN_PREFERENCES = [
    ["sp", "showPreferences"],
    ["sp", "showPreferenceCenter"],
    ["sp", "openPreferences"],
    ["SecurePrivacy", "showPreferences"]
  ];

  function openPreferences() {
    for (var i = 0; i < OPEN_PREFERENCES.length; i++) {
      var obj = window[OPEN_PREFERENCES[i][0]];
      var fn = obj && obj[OPEN_PREFERENCES[i][1]];
      if (typeof fn === "function") { fn.call(obj); return true; }
    }
    return false;
  }

  function start() {
    document.querySelectorAll("[data-cookie-settings]").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        if (openPreferences()) return;
        if (location.pathname !== "/cookie-policy") location.assign("/cookie-policy#your-choice");
        else { var s = document.getElementById("your-choice"); if (s) s.scrollIntoView(); }
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
