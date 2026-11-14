import { resolve } from "path";
import { defineConfig } from "vite";
import { sync } from "glob";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

export default defineConfig({
  base: "/email-templates/",
  build: {
    rollupOptions: {
      input: [
        resolve(__dirname, "index.html"),
        resolve(__dirname, "preview.html"),
        resolve(__dirname, "supabase.html"),
        resolve(__dirname, "better-auth.html"),
        resolve(__dirname, "ecommerce-email-templates.html"),
        resolve(__dirname, "marketing-email-templates.html"),
        resolve(__dirname, "newsletter-email-templates.html"),
        resolve(__dirname, "account-email-templates.html"),
        resolve(__dirname, "auth-email-templates.html"),
        ...sync("./templates/**/*.html".replace(/\\/g, "/templates")),
      ],
    },
  },
  plugins: [
    ViteImageOptimizer({
      // SVGO cannot see external <symbol> references and would empty this sprite.
      exclude: /icons\.svg$/,
    }),
  ],
});
