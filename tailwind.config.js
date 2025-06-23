/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",   // ← Vite + React の典型パス
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
