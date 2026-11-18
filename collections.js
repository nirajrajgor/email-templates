// Every group of templates that has its own page, in the order the site lists
// them. A category collection holds the templates that name its key in the
// metadata, and an integration collection holds the files that start with it.
export const COLLECTIONS = [
  { key: "ecommerce", label: "Ecommerce", page: "ecommerce-email-templates.html" },
  { key: "marketing", label: "Marketing", page: "marketing-email-templates.html" },
  { key: "newsletter", label: "Newsletter", page: "newsletter-email-templates.html" },
  { key: "account", label: "Account", page: "account-email-templates.html" },
  { key: "auth", label: "Auth", page: "auth-email-templates.html" },
  { key: "supabase", label: "Supabase", page: "supabase.html" },
  { key: "better-auth", label: "Better Auth", page: "better-auth.html" },
];
