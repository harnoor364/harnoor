/* =====================================================================
   MAIN SCRIPT — site behaviour (you normally don't need to edit this).
   Content lives in js/data.js.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- Small helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Escape text before putting it into HTML (keeps review text safe).
  const esc = (str) =>
    String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Only allow http(s) links from the data file.
  const safeUrl = (url) => (/^https?:\/\//i.test(url || "") ? url : "");

  // Build a WhatsApp link with a pre-filled message.
  const waLink = (message) =>
    `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(message || SITE.defaultWhatsAppMessage)}`;

  // Show the example reviews when the address ends in ?preview
  const isPreview = new URLSearchParams(location.search).has("preview");
  const reviews = REVIEWS.length ? REVIEWS : isPreview ? SAMPLE_REVIEWS : [];

  /* ---------- Inline icons (no icon library = faster site) ---------- */
  const ICON = {
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>'
  };

  const stars = (rating) => {
    const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    let out = `<span class="stars" role="img" aria-label="${r} out of 5 stars">`;
    for (let i = 1; i <= 5; i++) out += `<span class="${i <= r ? "on" : ""}">${ICON.star}</span>`;
    return out + "</span>";
  };

  /* ---------- Contact details from data.js ---------- */
  function fillSiteInfo() {
    $$("[data-wa]").forEach((el) => (el.href = waLink(el.getAttribute("data-wa"))));
    $$('[data-site="email"]').forEach((el) => {
      el.href = `mailto:${SITE.email}`;
      if (!el.children.length) el.textContent = SITE.email;
    });
    $$('[data-site="email-text"]').forEach((el) => (el.textContent = SITE.email));
    $$('[data-site="phone-text"]').forEach((el) => (el.textContent = SITE.phoneDisplay));
    $$('[data-site="location-text"]').forEach((el) => (el.textContent = SITE.location));
    $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
  }

  /* ---------- Navigation ---------- */
  function initNav() {
    const page = document.body.getAttribute("data-page");
    $$("[data-nav]").forEach((a) => {
      if (a.getAttribute("data-nav") === page) a.setAttribute("aria-current", "page");
    });

    const toggle = $(".nav-toggle");
    const nav = $("#main-nav");
    if (toggle && nav) {
      const setOpen = (open) => {
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        document.body.classList.toggle("nav-open", open);
      };
      toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
      $$("a", nav).forEach((a) => a.addEventListener("click", () => setOpen(false)));
      document.addEventListener("keydown", (e) => e.key === "Escape" && setOpen(false));
    }

    // Add a soft shadow to the header once the page is scrolled
    const header = $(".site-header");
    const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Portfolio cards ---------- */
  function projectCard(p) {
    const url = safeUrl(p.url);
    const tags = (p.tags || []).map((t) => `<li>${esc(t)}</li>`).join("");
    const button = url
      ? `<a class="btn btn-primary btn-sm" href="${esc(url)}" target="_blank" rel="noopener">Visit Live Site ${ICON.external}</a>`
      : `<span class="btn btn-muted btn-sm" aria-disabled="true">Live link coming soon</span>`;
    return `
      <article class="card project-card reveal">
        <div class="project-thumb">
          <img src="${esc(p.image)}" alt="${esc(p.category)} website${p.location ? ` in ${esc(p.location)}` : ""} – desktop view (${esc(p.title)})" loading="lazy" width="1200" height="750">
          ${p.mobileImage ? `<span class="thumb-phone"><img src="${esc(p.mobileImage)}" alt="${esc(p.category)} website${p.location ? ` in ${esc(p.location)}` : ""} – mobile view (${esc(p.title)})" loading="lazy" width="390" height="844"></span>` : ""}
          ${p.note ? `<span class="project-note">${esc(p.note)}</span>` : ""}
        </div>
        <div class="project-body">
          <p class="project-cat">${esc(p.category)}${p.location ? ` · <span>${esc(p.location)}</span>` : ""}</p>
          <h3>${esc(p.title)}</h3>
          <p class="project-desc">${esc(p.description)}</p>
          <ul class="tags" aria-label="Features built">${tags}</ul>
          <div class="project-actions">${button}</div>
        </div>
      </article>`;
  }

  // Final card that invites a new client
  const nextProjectCard = () => `
      <a class="card project-card project-next reveal" href="/contact">
        <span class="next-icon">${ICON.plus}</span>
        <h3>Your business could be next</h3>
        <p>Tell me about your clinic, shop or restaurant and I'll show you what your website could look like.</p>
        <span class="link-arrow">Start your project ${ICON.arrow}</span>
      </a>`;

  function renderProjects() {
    $$("[data-projects]").forEach((el) => {
      const mode = el.getAttribute("data-projects");
      const featuredOnly = mode === "featured";
      let list = PROJECTS;
      if (featuredOnly) {
        list = PROJECTS.filter((p) => p.featured).slice(0, 3);
        if (!list.length) list = PROJECTS.slice(0, 3);
      } else if (mode === "doctors") {
        // Doctors page: projects whose category mentions a clinic or medical practice
        list = PROJECTS.filter((p) => /clinic|medical|doctor|dental|hospital/i.test(p.category));
      } else if (mode === "filter") {
        // Industry pages: data-filter="restaurant|cafe" matches the project's category
        const re = new RegExp(el.getAttribute("data-filter") || "^$", "i");
        list = PROJECTS.filter((p) => re.test(p.category));
      }
      el.innerHTML = list.map(projectCard).join("") + (featuredOnly ? "" : nextProjectCard());
    });
  }

  /* ---------- Reviews ---------- */
  function reviewCard(r) {
    const initials = esc(String(r.name || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase());
    const photo = r.photo
      ? `<img src="${esc(r.photo)}" alt="Photo of ${esc(r.name)}" loading="lazy" width="48" height="48">`
      : `<span aria-hidden="true">${initials}</span>`;
    const site = safeUrl(r.website);
    return `
      <article class="card review-card reveal">
        ${stars(r.rating)}
        <blockquote>“${esc(r.text)}”</blockquote>
        <footer class="review-author">
          <div class="avatar">${photo}</div>
          <div>
            <p class="review-name">${esc(r.name)}</p>
            <p class="review-biz">${esc(r.business)}</p>
          </div>
        </footer>
        ${site ? `<a class="link-arrow review-link" href="${esc(site)}" target="_blank" rel="noopener">See their website ${ICON.external}</a>` : ""}
      </article>`;
  }

  const emptyReviews = () => `
      <div class="card empty-card reveal">
        <span class="empty-stars">${stars(5)}</span>
        <h3>Reviews are on their way</h3>
        <p>Already worked with me? I'd love to hear how your new website is doing.</p>
        <a class="btn btn-outline btn-sm" href="/reviews#leave-review">Leave a review</a>
      </div>`;

  function renderReviews() {
    $$("[data-reviews]").forEach((el) => {
      const featuredOnly = el.getAttribute("data-reviews") === "featured";
      let list = featuredOnly ? reviews.filter((r) => r.featured).slice(0, 2) : reviews;
      if (featuredOnly && !list.length) list = reviews.slice(0, 2);
      el.innerHTML = list.length ? list.map(reviewCard).join("") : emptyReviews();
      el.classList.toggle("is-empty", !list.length);
    });

    // Average rating summary (Reviews page)
    $$("[data-rating-summary]").forEach((el) => {
      if (!reviews.length) {
        el.innerHTML = `<p class="summary-empty">No reviews yet — be the first to share your experience.</p>`;
        return;
      }
      const avg = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length;
      const counts = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => Math.round(r.rating) === n).length }));
      el.innerHTML = `
        <div class="summary-score">
          <p class="summary-number">${avg.toFixed(1)}</p>
          ${stars(avg)}
          <p class="summary-count">Based on ${reviews.length} review${reviews.length === 1 ? "" : "s"}</p>
        </div>
        <ul class="summary-bars">
          ${counts
            .map(
              ({ n, c }) => `<li><span>${n}★</span><span class="bar"><i style="width:${(c / reviews.length) * 100}%"></i></span><span>${c}</span></li>`
            )
            .join("")}
        </ul>`;
    });
  }

  /* ---------- Pricing cards (website packages + monthly plans) ---------- */
  // One card; `badge` (e.g. "Most Popular") highlights it.
  const priceCard = (p, badge, msg) => `
        <article class="card price-card reveal${badge ? " popular" : ""}">
          ${badge ? `<span class="badge-popular">${esc(badge)}</span>` : ""}
          <h3>${esc(p.name)}</h3>
          <p class="price-tagline">${esc(p.tagline)}</p>
          <p class="price"><span>${esc(p.price)}</span><small>${esc(p.priceNote)}</small></p>
          <ul class="price-features">
            ${p.features.map((f) => `<li>${ICON.check}<span>${esc(f)}</span></li>`).join("")}
          </ul>
          <a class="btn ${badge ? "btn-primary" : "btn-outline"} btn-block" href="${waLink(msg)}" target="_blank" rel="noopener">Get Started</a>
        </article>`;

  function renderPricing() {
    const packages = $("[data-pricing]");
    if (packages) {
      packages.innerHTML = PACKAGES.map((p) =>
        priceCard(p, p.popular ? "Most Popular" : "", `Hi Harnoor! I'm interested in the ${p.name} package (${p.price}). Can you tell me more?`)
      ).join("");
    }
    if (typeof MONTHLY_PLANS === "undefined") return;
    $$("[data-plans]").forEach((el) => {
      // data-plans="seo" (SEO page) shows only the plans that include SEO
      const list = el.getAttribute("data-plans") === "seo" ? MONTHLY_PLANS.filter((p) => /seo|complete/i.test(p.name)) : MONTHLY_PLANS;
      el.innerHTML = list.map((p) => priceCard(p, p.badge, `Hi Harnoor, I'm interested in the ${p.name} plan.`)).join("");
    });
  }

  /* ---------- Scroll reveal animations ---------- */
  function initReveal() {
    const items = $$(".reveal");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach((el) => el.classList.add("visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    // Stagger cards that sit side by side
    items.forEach((el) => {
      const siblings = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
      const i = siblings.indexOf(el);
      if (i > 0) el.style.transitionDelay = `${Math.min(i, 4) * 80}ms`;
      io.observe(el);
    });
  }

  /* ---------- Star rating input ---------- */
  function initStarInput() {
    $$(".star-input").forEach((group) => {
      const label = $(".star-input-label", group.parentElement);
      const words = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
      $$("input", group).forEach((input) =>
        input.addEventListener("change", () => label && (label.textContent = `${input.value} / 5 — ${words[input.value]}`))
      );
    });
  }

  /* ---------- Contact page: preselect package from ?package=Standard ---------- */
  function preselectPackage() {
    const pkg = new URLSearchParams(location.search).get("package");
    const select = $("#package");
    if (pkg && select) {
      const opt = $$("option", select).find((o) => o.value.toLowerCase() === pkg.toLowerCase());
      if (opt) select.value = opt.value;
    }
  }

  /* ---------- Netlify forms (submitted without leaving the page) ---------- */
  function initForms() {
    $$("form[data-ajax-form]").forEach((form) => {
      const status = $(".form-status", form);
      const success = document.getElementById(form.getAttribute("data-success"));
      const button = $('button[type="submit"]', form);

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        // Photo uploads: Netlify allows up to 8 MB per submission
        const file = $('input[type="file"]', form);
        if (file && file.files[0] && file.files[0].size > 8 * 1024 * 1024) {
          status.textContent = "That photo is too large. Please choose one under 8 MB.";
          status.className = "form-status error";
          return;
        }

        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Sending…";
        status.textContent = "";
        status.className = "form-status";

        try {
          const data = new FormData(form);
          // Forms with a file upload must be sent as multipart; others as URL-encoded
          const hasFile = form.enctype === "multipart/form-data";
          const res = await fetch("/", {
            method: "POST",
            body: hasFile ? data : new URLSearchParams(data).toString(),
            headers: hasFile ? undefined : { "Content-Type": "application/x-www-form-urlencoded" }
          });
          if (!res.ok) throw new Error(res.status);
          form.reset();
          $$(".star-input-label", form).forEach((l) => (l.textContent = "Tap a star to rate"));
          form.hidden = true;
          if (success) {
            success.hidden = false;
            success.focus();
          }
        } catch (err) {
          // Form service not available (e.g. the site is hosted on Vercel, not Netlify):
          // send the same details through WhatsApp instead, so no enquiry is lost.
          const lines = [`New ${form.getAttribute("name")} from the website:`];
          $$("input, select, textarea", form).forEach((field) => {
            if (field.type === "hidden" || field.type === "file" || field.name === "bot-field" || !field.value) return;
            if (field.type === "radio" && !field.checked) return;
            const label = field.type === "radio" ? "Rating" : ($(`label[for="${field.id}"]`, form)?.childNodes[0]?.textContent || field.name).trim();
            lines.push(`${label}: ${field.type === "radio" ? `${field.value}/5` : field.value}`);
          });
          window.open(waLink(lines.join("\n")), "_blank", "noopener");
          status.innerHTML = `WhatsApp has opened with your details. Just tap <strong>Send</strong>. If it didn't open, <a href="${waLink(lines.join("\n"))}" target="_blank" rel="noopener">tap here</a>.`;
          status.className = "form-status";
        } finally {
          button.disabled = false;
          button.textContent = originalText;
        }
      });
    });
  }

  /* ---------- Start ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    fillSiteInfo();
    initNav();
    renderProjects();
    renderReviews();
    renderPricing();
    initStarInput();
    preselectPackage();
    initForms();
    initReveal(); // last, so it also animates the cards created above
  });
})();
