// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";
import { sync } from "glob";

export default defineConfig({
  build: {
    rollupOptions: {
      input: [
        resolve(__dirname, "index.html"),
        ...sync("./templates/**/*.html".replace(/\\/g, "/templates")),
      ],
    },
  },
});
