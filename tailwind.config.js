/** @type {import('tailwindcss').Config} */
export default {
  // Keep legacy dark utilities inactive until the site has a complete dark theme.
  // OS-driven dark variants otherwise mix light surfaces with light text.
  darkMode: "class",
  content: [
    "./*.{html,js}",
    "./partials/*.html",
    "./templates/**/*.{html,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animated")],
};
