/** @type {import('tailwindcss').Config} */
export default {
  content: ["./*.{html,js}", "./templates/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("tailwindcss-animated")],
};
