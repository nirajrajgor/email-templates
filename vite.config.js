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
