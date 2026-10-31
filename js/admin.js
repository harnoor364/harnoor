/* =====================================================================
   ADMIN PANEL (/admin) — edit the website's content without code.

   - Sign in with the site owner's Supabase account. Only accounts listed
     in the `admins` table can save (enforced by Row Level Security in
     Supabase, not just by this page). See docs/ADMIN-PANEL.md.
   - Sections are saved to the `site_content` table. js/content.js loads
     them on every page, in place of the built-in js/data.js.
   - Images upload to the public `site-media` storage bucket.
   - Client projects: edit each client's project name, status and notes
     (the table /account reads).
   - Everything is built with textContent / input values (never innerHTML
     with saved data), so content typed here can't inject code.
   ===================================================================== */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var el = function (tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (k in n && k !== "list") n[k] = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  };
  var show = function (sel, on) { var n = $(sel); if (n) n.hidden = !on; };
  var say = function (node, msg, kind) { node.textContent = msg; node.className = "form-status" + (kind ? " " + kind : ""); };
  var clone = function (v) { return JSON.parse(JSON.stringify(v)); };

  var BUCKET = "site-media";
  var MAX_IMAGE = 5 * 1024 * 1024;
  var STATUSES = ["Not started", "Designing", "In review", "Live"];

  /* ---------- What can be edited ---------- */
  var SITE_FIELDS = [
    { name: "phoneDisplay", label: "Phone (as shown)", type: "text", hint: "e.g. +91 79733 53244" },
    { name: "whatsapp", label: "WhatsApp number (digits only, with country code)", type: "text", pattern: "^\\d{8,15}$", hint: "e.g. 917973353244" },
    { name: "email", label: "Email", type: "email" },
    { name: "location", label: "Location", type: "text" },
    { name: "defaultWhatsAppMessage", label: "Default WhatsApp message", type: "textarea" }
  ];
  var LISTS = {
    projects: {
      label: "Portfolio", item: "project", titleField: "title", defaults: function () { return PROJECTS; },
      fields: [
        { name: "title", label: "Business name", type: "text", required: true },
        { name: "category", label: "Category label", type: "text", hint: "e.g. Doctor's Clinic" },
        { name: "location", label: "Location (optional)", type: "text" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "image", label: "Desktop screenshot (1200×750 works best)", type: "image" },
        { name: "mobileImage", label: "Phone screenshot (optional, 390×844)", type: "image" },
        { name: "url", label: "Live link (optional)", type: "url" },
        { name: "tags", label: "Features (one per line)", type: "lines" },
        { name: "featured", label: "Show on the Home page (max 3)", type: "checkbox" },
        { name: "note", label: "Small badge (optional, e.g. Concept)", type: "text" }
      ]
    },
    reviews: {
      label: "Reviews", item: "review", titleField: "name", defaults: function () { return REVIEWS; },
      fields: [
        { name: "name", label: "Client name", type: "text", required: true },
        { name: "business", label: "Business", type: "text" },
        { name: "rating", label: "Rating (1–5)", type: "number", min: 1, max: 5 },
        { name: "text", label: "What they said", type: "textarea", required: true },
        { name: "photo", label: "Photo (optional)", type: "image" },
        { name: "website", label: "Their website (optional)", type: "url" },
        { name: "featured", label: "Show on the Home page (max 2)", type: "checkbox" }
      ],
      note: "Only add reviews your clients actually gave you."
    },
    packages: {
      label: "Website packages", item: "package", titleField: "name", defaults: function () { return PACKAGES; },
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "price", label: "Price", type: "text", hint: "e.g. ₹8,000 – 10,000" },
        { name: "priceNote", label: "Price note", type: "text", hint: "e.g. one-time" },
        { name: "tagline", label: "Tagline", type: "textarea" },
        { name: "features", label: "What's included (one per line)", type: "lines" },
        { name: "popular", label: "Highlight as \"Most Popular\"", type: "checkbox" }
      ],
      note: "Prices also appear in the text and search-engine data of the Pricing page. If you change a price here, ask for those to be updated too."
    },
    monthly_plans: {
      label: "Monthly plans", item: "plan", titleField: "name", defaults: function () { return MONTHLY_PLANS; },
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        { name: "price", label: "Price", type: "text", hint: "e.g. ₹4,999" },
        { name: "priceNote", label: "Price note", type: "text", hint: "e.g. /month" },
        { name: "tagline", label: "Tagline", type: "textarea" },
        { name: "features", label: "What's included (one per line)", type: "lines" },
        { name: "badge", label: "Highlight badge (optional, e.g. Most Complete)", type: "text" }
      ]
    }
  };
  var TABS = [["site", "Business details"], ["projects", "Portfolio"], ["reviews", "Reviews"], ["packages", "Website packages"], ["monthly_plans", "Monthly plans"], ["clients", "Client projects"]];

  var sb = null;
  var saved = {};            // key → value as last loaded/saved
  var dirty = {};            // key → true when there are unsaved edits

  /* ---------- Start ---------- */
  function start() {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey || !window.supabase) {
      $("[data-admin-loading]").textContent = "The admin panel can't connect to the database. Please refresh, or try again later.";
      return;
    }
    sb = window.supabase.createClient(cfg.url, cfg.anonKey, { auth: { persistSession: true, autoRefreshToken: true } });
    document.querySelectorAll("[data-admin-logout]").forEach(function (b) {
      b.addEventListener("click", function () { sb.auth.signOut().then(function () { location.reload(); }); });
    });
    $("[data-admin-login-form]").addEventListener("submit", login);
    window.addEventListener("beforeunload", function (e) {
      if (Object.keys(dirty).some(function (k) { return dirty[k]; })) { e.preventDefault(); e.returnValue = ""; }
    });
    sb.auth.getSession().then(function (r) { route(r.data.session); });
  }

  function login(e) {
    e.preventDefault();
    var form = e.currentTarget, status = $(".form-status", form), btn = $("button[type=submit]", form);
    if (!form.checkValidity()) { form.reportValidity(); return; }
    btn.disabled = true;
    sb.auth.signInWithPassword({ email: form.email.value.trim(), password: form.password.value }).then(function (r) {
      btn.disabled = false;
      if (r.error) { say(status, /confirm/i.test(r.error.message) ? "Please verify this email address first." : "That email and password don't match.", "error"); return; }
      route(r.data.session);
    });
  }

  function route(session) {
    show("[data-admin-loading]", false);
    if (!session) { show("[data-admin-login]", true); return; }
    sb.rpc("is_admin").then(function (r) {
      if (r.error || r.data !== true) {
        $("[data-admin-who]").textContent = "Signed in as " + session.user.email + ".";
        show("[data-admin-login]", false); show("[data-admin-denied]", true);
        return;
      }
      show("[data-admin-login]", false);
      $("[data-admin-email]").textContent = session.user.email;
      show("[data-admin-app]", true);
      loadContent();
    });
  }

  /* ---------- Tabs ---------- */
  function buildTabs() {
    var tabs = $("[data-admin-tabs]"), panels = $("[data-admin-panels]");
    tabs.textContent = ""; panels.textContent = "";
    TABS.forEach(function (t, i) {
      var btn = el("button", { type: "button", class: "admin-tab", role: "tab", id: "tab-" + t[0], text: t[1] });
      btn.setAttribute("aria-controls", "panel-" + t[0]);
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      var panel = el("section", { class: "admin-panel", id: "panel-" + t[0], role: "tabpanel" });
      panel.setAttribute("aria-labelledby", "tab-" + t[0]);
      panel.hidden = i !== 0;
      btn.addEventListener("click", function () {
        tabs.querySelectorAll(".admin-tab").forEach(function (b) { b.setAttribute("aria-selected", b === btn ? "true" : "false"); });
        panels.querySelectorAll(".admin-panel").forEach(function (p) { p.hidden = p !== panel; });
        if (t[0] === "clients") loadClients(panel);
      });
      tabs.appendChild(btn); panels.appendChild(panel);
    });
  }

  function loadContent() {
    buildTabs();
    sb.from("site_content").select("key,value").then(function (r) {
      var rows = r.data || [];
      var get = function (k) { var row = rows.find(function (x) { return x.key === k; }); return row ? row.value : null; };
      saved.site = Object.assign({}, pick(SITE), get("site") || {});
      Object.keys(LISTS).forEach(function (k) { saved[k] = Array.isArray(get(k)) ? get(k) : clone(LISTS[k].defaults()); });
      renderSite($("#panel-site"));
      Object.keys(LISTS).forEach(function (k) { renderList($("#panel-" + k), k); });
      if (r.error) $("#panel-site").prepend(el("p", { class: "form-status error", text: "Couldn't load saved content (" + r.error.message + "). Showing the built-in content." }));
    });
  }
  function pick(site) { var o = {}; SITE_FIELDS.forEach(function (f) { o[f.name] = site[f.name] || ""; }); return o; }

  /* ---------- Saving ---------- */
  function save(key, value, status, btn) {
    btn.disabled = true; say(status, "Saving…");
    sb.from("site_content").upsert({ key: key, value: value }).then(function (r) {
      btn.disabled = false;
      if (r.error) { say(status, "Not saved: " + r.error.message, "error"); return; }
      saved[key] = clone(value); dirty[key] = false;
      say(status, "Saved. The website shows this now (refresh it to see).", "ok");
    });
  }

  /* ---------- Field editors ---------- */
  function fieldInput(f, value, onChange, idBase) {
    var id = idBase + "-" + f.name, input;
    var wrap = el("div", { class: f.type === "checkbox" ? "check-row" : "field" });
    if (f.type === "checkbox") {
      input = el("input", { type: "checkbox", id: id, checked: !!value });
      input.addEventListener("change", function () { onChange(input.checked); });
      wrap.append(input, el("label", { htmlFor: id, text: f.label }));
      return wrap;
    }
    wrap.appendChild(el("label", { htmlFor: id, text: f.label }));
    if (f.type === "textarea" || f.type === "lines") {
      input = el("textarea", { id: id, rows: f.type === "lines" ? 5 : 3 });
      input.value = f.type === "lines" ? (value || []).join("\n") : (value || "");
      input.addEventListener("input", function () {
        onChange(f.type === "lines" ? input.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean) : input.value);
      });
    } else if (f.type === "image") {
      return imageField(f, value, onChange, id, wrap);
    } else {
      input = el("input", { id: id, type: f.type === "number" ? "number" : f.type === "url" ? "url" : f.type === "email" ? "email" : "text" });
      if (f.min) input.min = f.min;
      if (f.max) input.max = f.max;
      if (f.pattern) input.pattern = f.pattern;
      input.value = value == null ? "" : value;
      input.addEventListener("input", function () { onChange(f.type === "number" ? Number(input.value) : input.value.trim()); });
    }
    if (f.required) input.required = true;
    wrap.appendChild(input);
    if (f.hint) wrap.appendChild(el("p", { class: "field-hint", text: f.hint }));
    return wrap;
  }

  function imageField(f, value, onChange, id, wrap) {
    var preview = el("img", { class: "admin-thumb", alt: "", hidden: !value });
    if (value) preview.src = value;
    var path = el("input", { id: id, type: "text", value: value || "", placeholder: "images/projects/… or upload below" });
    var file = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp" });
    var msg = el("p", { class: "field-hint" });
    path.addEventListener("input", function () { onChange(path.value.trim()); preview.hidden = !path.value; preview.src = path.value; });
    file.setAttribute("aria-label", "Upload " + f.label);
    file.addEventListener("change", function () {
      var fl = file.files[0];
      if (!fl) return;
      if (fl.size > MAX_IMAGE) { msg.textContent = "Please choose an image under 5 MB."; return; }
      var safe = fl.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+/, "").slice(-60);
      var key = f.name + "/" + Date.now() + "-" + safe;
      msg.textContent = "Uploading…";
      sb.storage.from(BUCKET).upload(key, fl, { contentType: fl.type, upsert: false }).then(function (r) {
        if (r.error) { msg.textContent = "Upload failed: " + r.error.message; return; }
        var url = sb.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
        path.value = url; preview.src = url; preview.hidden = false; onChange(url);
        msg.textContent = "Uploaded. Remember to save.";
      });
    });
    wrap.append(path, preview, file, msg);
    return wrap;
  }

  /* ---------- Business details ---------- */
  function renderSite(panel) {
    panel.textContent = "";
    var value = clone(saved.site);
    var form = el("form", { class: "admin-card", noValidate: true });
    var grid = el("div", { class: "form-grid" });
    SITE_FIELDS.forEach(function (f) {
      grid.appendChild(fieldInput(f, value[f.name], function (v) { value[f.name] = v; dirty.site = true; }, "site"));
    });
    var status = el("p", { class: "form-status", role: "status" });
    var btn = el("button", { class: "btn btn-primary", type: "submit", text: "Save business details" });
    form.append(el("h2", { text: "Business details" }), el("p", { class: "muted small", text: "Used in the footer, contact page and every WhatsApp button." }), grid, el("div", { class: "form-submit" }, [btn]), status);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      save("site", value, status, btn);
    });
    panel.appendChild(form);
  }

  /* ---------- Lists (portfolio, reviews, packages, plans) ---------- */
  function renderList(panel, key) {
    var spec = LISTS[key], items = clone(saved[key]);
    panel.textContent = "";
    var head = el("div", { class: "admin-card" }, [el("h2", { text: spec.label }), spec.note ? el("p", { class: "muted small", text: spec.note }) : null]);
    var listEl = el("div", { class: "admin-list" });
    var status = el("p", { class: "form-status", role: "status" });
    var saveBtn = el("button", { class: "btn btn-primary", type: "button", text: "Save " + spec.label.toLowerCase() });
    var addBtn = el("button", { class: "btn btn-outline", type: "button", text: "Add a " + spec.item });
    var reset = el("button", { class: "btn btn-outline btn-sm", type: "button", text: "Undo unsaved changes" });
    var touch = function () { dirty[key] = true; say(status, "Unsaved changes."); };

    function draw() {
      listEl.textContent = "";
      if (!items.length) listEl.appendChild(el("p", { class: "muted", text: "Nothing here yet." }));
      items.forEach(function (item, i) {
        var title = el("h3", { text: item[spec.titleField] || "(untitled " + spec.item + ")" });
        var fields = el("div", { class: "form-grid" });
        spec.fields.forEach(function (f) {
          fields.appendChild(fieldInput(f, item[f.name], function (v) {
            item[f.name] = v; touch();
            if (f.name === spec.titleField) title.textContent = v || "(untitled " + spec.item + ")";
          }, key + "-" + i));
        });
        var up = el("button", { class: "btn btn-outline btn-sm", type: "button", text: "Move up", disabled: i === 0 });
        var down = el("button", { class: "btn btn-outline btn-sm", type: "button", text: "Move down", disabled: i === items.length - 1 });
        var del = el("button", { class: "btn btn-outline btn-sm admin-danger", type: "button", text: "Delete" });
        up.addEventListener("click", function () { items.splice(i - 1, 0, items.splice(i, 1)[0]); touch(); draw(); });
        down.addEventListener("click", function () { items.splice(i + 1, 0, items.splice(i, 1)[0]); touch(); draw(); });
        del.addEventListener("click", function () {
          if (!confirm("Delete \"" + (item[spec.titleField] || "this " + spec.item) + "\"? It disappears from the website when you save.")) return;
          items.splice(i, 1); touch(); draw();
        });
        listEl.appendChild(el("details", { class: "admin-item", open: !item[spec.titleField] }, [
          el("summary", {}, [title]), fields, el("div", { class: "admin-item-actions" }, [up, down, del])
        ]));
      });
    }
    addBtn.addEventListener("click", function () {
      var blank = {};
      spec.fields.forEach(function (f) { blank[f.name] = f.type === "checkbox" ? false : f.type === "lines" ? [] : f.type === "number" ? 5 : ""; });
      items.push(blank); touch(); draw();
      var last = listEl.lastElementChild; if (last) { last.open = true; var inp = last.querySelector("input,textarea"); if (inp) inp.focus(); }
    });
    reset.addEventListener("click", function () { items = clone(saved[key]); dirty[key] = false; say(status, ""); draw(); });
    saveBtn.addEventListener("click", function () {
      var missing = items.findIndex(function (it) { return spec.fields.some(function (f) { return f.required && !String(it[f.name] || "").trim(); }); });
      if (missing !== -1) { say(status, "Item " + (missing + 1) + " is missing a required field.", "error"); return; }
      save(key, items, status, saveBtn);
    });
    draw();
    panel.append(head, listEl, el("div", { class: "admin-bar" }, [addBtn, saveBtn, reset]), status);
  }

  /* ---------- Client projects ---------- */
  function loadClients(panel) {
    panel.textContent = "";
    panel.appendChild(el("div", { class: "admin-card" }, [
      el("h2", { text: "Client projects" }),
      el("p", { class: "muted small", text: "What each client sees on their account page. A row appears automatically when a client signs up." })
    ]));
    var listEl = el("div", { class: "admin-list" }, [el("p", { class: "muted", text: "Loading…" })]);
    panel.appendChild(listEl);
    sb.from("client_projects").select("user_id,client_name,project_name,status,notes,updated_at").order("updated_at", { ascending: false }).then(function (r) {
      listEl.textContent = "";
      if (r.error) { listEl.appendChild(el("p", { class: "form-status error", text: "Couldn't load clients: " + r.error.message })); return; }
      if (!r.data.length) { listEl.appendChild(el("p", { class: "muted", text: "No clients have signed up yet." })); return; }
      r.data.forEach(function (row, i) {
        var form = el("form", { class: "admin-item admin-client", noValidate: true });
        var name = el("input", { id: "c-name-" + i, type: "text", value: row.project_name || "" });
        var status = el("select", { id: "c-status-" + i });
        STATUSES.forEach(function (s) { status.appendChild(el("option", { value: s, text: s, selected: s === row.status })); });
        var notes = el("textarea", { id: "c-notes-" + i, rows: 3, maxLength: 2000 });
        notes.value = row.notes || "";
        var msg = el("p", { class: "form-status", role: "status" });
        var btn = el("button", { class: "btn btn-primary btn-sm", type: "submit", text: "Save" });
        form.append(
          el("h3", { text: row.client_name || "(no name)" }),
          el("div", { class: "form-grid" }, [
            el("div", { class: "field" }, [el("label", { htmlFor: "c-name-" + i, text: "Project name" }), name]),
            el("div", { class: "field" }, [el("label", { htmlFor: "c-status-" + i, text: "Status" }), status]),
            el("div", { class: "field" }, [el("label", { htmlFor: "c-notes-" + i, text: "Notes for the client" }), notes])
          ]),
          el("div", { class: "admin-item-actions" }, [btn]), msg
        );
        form.addEventListener("submit", function (e) {
          e.preventDefault(); btn.disabled = true; say(msg, "Saving…");
          sb.from("client_projects").update({ project_name: name.value.trim() || null, status: status.value, notes: notes.value.trim() || null })
            .eq("user_id", row.user_id).select("user_id").then(function (u) {
              btn.disabled = false;
              if (u.error || !u.data || !u.data.length) { say(msg, "Not saved" + (u.error ? ": " + u.error.message : ""), "error"); return; }
              say(msg, "Saved. The client sees this next time they open their account.", "ok");
            });
        });
        listEl.appendChild(form);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
