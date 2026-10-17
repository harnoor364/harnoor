/* =====================================================================
   Header link: "Log in" becomes "My account" when someone is logged in.
   Loaded on every page. It only checks whether Supabase's login session
   exists in this browser (an essential, login-only item); it does not
   load the Supabase library or contact any server.
   ===================================================================== */
(function () {
  "use strict";
  let loggedIn = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (/^sb-[a-z0-9-]+-auth-token$/.test(localStorage.key(i) || "")) { loggedIn = true; break; }
    }
  } catch (e) { /* storage blocked: treat as logged out */ }
  const apply = () => {
    document.querySelectorAll("[data-account-link]").forEach((a) => {
      a.textContent = loggedIn ? "My account" : "Log in";
      a.setAttribute("href", loggedIn ? "/account" : "/login");
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply);
  else apply();
})();
