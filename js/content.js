/* =====================================================================
   EDITABLE CONTENT — loads what you change in the admin panel (/admin)
   from Supabase (table site_content) and puts it in place of the
   built-in content from js/data.js:
     site           → SITE (phone, WhatsApp, email, location, message)
     projects       → PROJECTS (portfolio)
     reviews        → REVIEWS
     packages       → PACKAGES
     monthly_plans  → MONTHLY_PLANS
   The page first shows js/data.js, then redraws when this arrives
   (js/main.js waits on window.uwContentReady). If Supabase is slow (over
   4 seconds), down or returns something unexpected, js/data.js stays.
   ===================================================================== */
(function () {
  "use strict";

  var isObj = function (v) { return v && typeof v === "object" && !Array.isArray(v); };
  var isList = function (v) { return Array.isArray(v) && v.every(isObj); };
  var replaceList = function (target, list) { target.splice.apply(target, [0, target.length].concat(list)); };

  var SITE_FIELDS = ["whatsapp", "phoneDisplay", "email", "location", "defaultWhatsAppMessage"];

  function apply(rows) {
    var changed = false;
    (Array.isArray(rows) ? rows : []).forEach(function (row) {
      var v = row && row.value;
      switch (row && row.key) {
        case "site":
          if (!isObj(v)) return;
          SITE_FIELDS.forEach(function (k) {
            if (typeof v[k] === "string" && v[k].trim() && (k !== "whatsapp" || /^\d{8,15}$/.test(v[k]))) { SITE[k] = v[k]; changed = true; }
          });
          break;
        case "projects": if (isList(v)) { replaceList(PROJECTS, v); changed = true; } break;
        case "reviews": if (isList(v)) { replaceList(REVIEWS, v); changed = true; } break;
        case "packages": if (isList(v) && v.length) { replaceList(PACKAGES, v); changed = true; } break;
        case "monthly_plans": if (isList(v) && v.length) { replaceList(MONTHLY_PLANS, v); changed = true; } break;
      }
    });
    return changed;
  }

  window.uwContentReady = (function () {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey || !window.fetch || typeof SITE === "undefined") return Promise.resolve(false);
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
    return fetch(cfg.url + "/rest/v1/site_content?select=key,value", {
      headers: { apikey: cfg.anonKey, Accept: "application/json" },
      signal: ctl ? ctl.signal : undefined
    })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(apply)
      .catch(function () { return false; })
      .then(function (changed) { clearTimeout(timer); return changed; });
  })();
})();
