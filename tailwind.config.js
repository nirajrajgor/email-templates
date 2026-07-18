/** @type {import('tailwindcss').Config} */
export default {
  content: ["./*.html", "./templates/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animated")],
};
