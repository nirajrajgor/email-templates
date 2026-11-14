// The homepage used to filter templates in place and keep the filter in the
// URL. Send those old links to the page that replaced each filter.
const CATEGORY_PAGES = {
  ecommerce: "ecommerce-email-templates.html",
  marketing: "marketing-email-templates.html",
  newsletter: "newsletter-email-templates.html",
  account: "account-email-templates.html",
  auth: "auth-email-templates.html",
  supabase: "supabase.html",
  "better-auth": "better-auth.html",
};

const category = new URLSearchParams(window.location.search).get("category");
const page = CATEGORY_PAGES[category];

if (page) window.location.replace(new URL(page, window.location.href));
