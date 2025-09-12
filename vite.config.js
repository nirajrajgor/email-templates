// vite.config.js
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
        ...sync("./templates/**/*.html".replace(/\\/g, "/templates")),
      ],
    },
  },
  plugins: [
    ViteImageOptimizer({
      /* pass your config */
    }),
  ],
});
