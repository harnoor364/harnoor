/* =====================================================================
   SITE DATA — this is the ONE file you edit to update the website.
   ---------------------------------------------------------------------
   1. SITE      → your contact details
   2. PROJECTS  → portfolio cards (Home + Portfolio pages)
   3. REVIEWS   → approved client reviews (Home + Reviews pages)
   4. PACKAGES  → website package cards (Packages page)
   5. MONTHLY_PLANS → monthly care & SEO plan cards (Packages page)

   Tips
   - Keep the commas between items: { ... }, { ... }
   - Text goes inside "double quotes". If your text contains a double
     quote, use ’ or write \" instead.
   - After saving, refresh the page (or push to GitHub → Netlify) to see it.
   ===================================================================== */


/* ---------------------------------------------------------------------
   1. SITE — contact details
   --------------------------------------------------------------------- */
const SITE = {
  name: "Harnoor Singh",
  // WhatsApp number: country code + number, digits only (no +, no spaces)
  whatsapp: "917973353244",
  phoneDisplay: "+91 79733 53244",
  email: "harnoor459456@gmail.com",
  location: "Ludhiana, Punjab, India",

  // Message pre-filled when someone taps a general WhatsApp button
  defaultWhatsAppMessage:
    "Hi Harnoor! I saw your website and I'd like to know more about getting a website for my business."
};


/* ---------------------------------------------------------------------
   2. PROJECTS — portfolio
   ---------------------------------------------------------------------
   To add a project, copy one { ... } block and change the values:

   {
     title:       "Business name",
     category:    "Dental Clinic",            // small label on the card
     location:    "Ludhiana",                 // optional
     description: "One or two short sentences about the project.",
     image:       "images/projects/my-project-desktop.webp",  // desktop screenshot (1200×750 works best)
     mobileImage: "images/projects/my-project-mobile.webp",   // optional phone screenshot (390×844)
     url:         "https://client-site.com",  // live link ("" = shows "Live link coming soon")
     tags:        ["Appointment Booking", "Google Maps"],
     featured:    true,                       // true = also shown on the Home page (max 3)
     note:        ""                          // optional small badge, e.g. "Concept"
   },

   Screenshots: put the image in /images/projects/ and set `image` to its path.
   --------------------------------------------------------------------- */
const PROJECTS = [
  {
    title: "Child Specialist Clinic",
    category: "Doctor's Clinic",
    location: "Ludhiana",
    description:
      "A calm, trustworthy website for a pediatrician's clinic. Parents can see services, clinic timings and fees, and request an appointment in a few taps.",
    image: "images/projects/pediatric-clinic-desktop.webp",
    mobileImage: "images/projects/pediatric-clinic-mobile.webp",
    url: "", // ← paste the live link here
    tags: ["Appointment Request", "Google Maps", "Click-to-Call", "Parent FAQs", "Mobile Friendly"],
    featured: true,
    note: ""
  },
  {
    title: "Grace Unisex Salon",
    category: "Salon",
    location: "Ludhiana",
    description:
      "A warm, elegant single-page website for a unisex salon in Omaxe Market, Pakhowal Road. Clients can browse services and book on WhatsApp or call in one tap.",
    image: "images/projects/grace-unisex-salon-desktop.webp",
    mobileImage: "images/projects/grace-unisex-salon-mobile.webp",
    url: "https://gracesalon.vercel.app/",
    tags: ["WhatsApp Booking", "Click-to-Call", "Google Reviews", "Services Menu", "Mobile Friendly"],
    featured: true,
    note: ""
  },
  {
    title: "Akash Pandey Tuitions",
    category: "Tuition Classes",
    location: "",
    description:
      "A website for a Physics & Chemistry tutor (Class 11–12, Boards, JEE, NEET) with an AI test-paper analyser that turns a photo of a test into a study plan.",
    image: "images/projects/akash-pandey-tuitions-desktop.webp",
    mobileImage: "images/projects/akash-pandey-tuitions-mobile.webp",
    url: "",
    tags: ["AI Test Analyser", "Demo Class Booking", "Lead Capture", "Testimonials", "Mobile Friendly"],
    featured: true,
    note: ""
  },
  {
    title: "Family Medicine Practice",
    category: "Medical Practice",
    location: "",
    description:
      "A modern website for a family physician, with a 3D layered hero, services, patient information, insurance details and an appointment request form.",
    image: "images/projects/family-practice-desktop.webp",
    mobileImage: "images/projects/family-practice-mobile.webp",
    url: "",
    tags: ["Appointment Request", "Patient FAQs", "Directions", "Accessibility", "SEO Setup"],
    featured: false,
    note: ""
  },
  {
    title: "BBQ Restaurant",
    category: "Restaurant",
    location: "",
    description:
      "A cinematic restaurant website concept: a 3D scroll walk from the street into the restaurant, menus, events and catering pages.",
    image: "images/projects/bbq-restaurant-desktop.webp",
    mobileImage: "images/projects/bbq-restaurant-mobile.webp",
    url: "",
    tags: ["3D Scroll Experience", "Menu Pages", "Catering Enquiry", "Events", "15 Pages"],
    featured: false,
    note: "Concept"
  },
  {
    title: "eBook Store",
    category: "Online Store",
    location: "",
    description:
      "A complete digital bookstore with search and filters, cart, discount codes, online payments, secure ebook downloads and an admin dashboard.",
    image: "images/projects/ebook-store.svg",
    url: "",
    tags: ["Online Payments", "Admin Dashboard", "Secure Downloads", "Discount Codes"],
    featured: false,
    note: ""
  }
];


/* ---------------------------------------------------------------------
   3. REVIEWS — approved client reviews
   ---------------------------------------------------------------------
   New reviews from the "Leave a Review" form arrive in your Netlify
   dashboard (Forms → review). They do NOT appear on the site by
   themselves. To publish one, copy the details into a block below:

   {
     name:     "Client name",
     business: "Business name",
     rating:   5,                               // 1 to 5
     text:     "What they said…",
     photo:    "images/reviews/client.jpg",     // optional — "" for initials
     website:  "https://their-site.com",        // optional — "" to hide the link
     featured: true                             // true = also shown on Home (max 2)
   },
   --------------------------------------------------------------------- */
const REVIEWS = [
  // Add your first approved review here.
];

/* Example reviews — ONLY shown when you open a page with ?preview at the
   end of the address (e.g. /reviews?preview), so you can see how
   review cards look before you have real ones. Visitors never see these. */
const SAMPLE_REVIEWS = [
  {
    name: "Example Client",
    business: "Example Dental Clinic",
    rating: 5,
    text: "This is an example review so you can preview the layout. Real reviews you approve will look exactly like this.",
    photo: "",
    website: "https://example.com",
    featured: true
  },
  {
    name: "Another Example",
    business: "Example Café",
    rating: 4,
    text: "Another example card for previewing the layout. Visitors never see these.",
    photo: "",
    website: "",
    featured: true
  }
];


/* ---------------------------------------------------------------------
   4. PACKAGES — pricing cards
   ---------------------------------------------------------------------
   `popular: true` highlights a card with the "Most Popular" badge.
   The "Get Started" button opens WhatsApp with the package name pre-filled.
   --------------------------------------------------------------------- */
const PACKAGES = [
  {
    name: "Basic",
    price: "₹8,000 – 10,000",
    priceNote: "one-time",
    tagline: "Get your business online, quickly and professionally.",
    features: [
      "Up to 5 pages",
      "Mobile-friendly (responsive) design",
      "Contact form",
      "WhatsApp chat button",
      "Click-to-call button",
      "Basic on-page SEO (titles & descriptions)",
      "Help with domain & hosting setup"
    ],
    popular: false
  },
  {
    name: "Standard",
    price: "₹20,000 – 30,000",
    priceNote: "one-time",
    tagline: "Everything a growing local business needs to get found and booked.",
    features: [
      "Up to 10 pages",
      "Everything in Basic",
      "SEO setup (Google Search Console & sitemap)",
      "Google Maps & Google Business Profile setup",
      "Booking / appointment form",
      "Photo gallery & social media links",
      "1 month of free support"
    ],
    popular: true
  },
  {
    name: "Premium",
    price: "₹50,000",
    priceNote: "one-time",
    tagline: "A fully custom website with advanced features.",
    features: [
      "Fully custom design",
      "Everything in Standard",
      "Advanced features (online payments, menus, product catalogue, etc.)",
      "Blog section",
      "Speed & performance optimisation",
      "Priority support",
      "3 months of free support"
    ],
    popular: false
  }
];


/* ---------------------------------------------------------------------
   5. MONTHLY_PLANS — monthly care & growth plans (Packages page)
   ---------------------------------------------------------------------
   `badge` adds a highlight label (e.g. "Most Complete") and highlights the card.
   "Get Started" opens WhatsApp with: "Hi Harnoor, I'm interested in the
   <name> plan."
   --------------------------------------------------------------------- */
const MONTHLY_PLANS = [
  {
    name: "Basic Maintenance",
    price: "₹4,999",
    priceNote: "/month",
    tagline: "Your website kept online, safe and up to date.",
    features: [
      "Uptime monitoring (hosting paid separately)",
      "Small text/image updates (up to 5 changes per month)",
      "Monthly backups",
      "Security & broken-link checks",
      "WhatsApp support"
    ],
    badge: ""
  },
  {
    name: "SEO Growth",
    price: "₹24,999",
    priceNote: "/month",
    tagline: "Climb higher on Google Search and Google Maps in your area.",
    features: [
      "Google Business Profile optimization & monthly posts",
      "Keyword research for your area (e.g. \"dentist in Ludhiana\")",
      "On-page SEO: titles, meta descriptions, headings",
      "Local listings/citations setup",
      "Monthly ranking & traffic report"
    ],
    badge: ""
  },
  {
    name: "Complete Care",
    price: "₹39,999",
    priceNote: "/month",
    tagline: "Maintenance + SEO together, with priority support.",
    features: [
      "Everything in Basic Maintenance and SEO Growth",
      "Priority support",
      "1 new page or blog post per month"
    ],
    badge: "Most Complete"
  }
];
