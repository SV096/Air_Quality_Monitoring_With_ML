/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}", // include ts/tsx in case you add later
  ],
  darkMode: "class", // allows toggling dark mode with `class="dark"`
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#dbeafe",
          300: "#60a5fa",
          400: "#3b82f6",
          500: "#2563eb",
          600: "#1d4ed8",
        },
        good: "#16a34a",
        moderate: "#facc15",
        unhealthy: "#f97316",
        "v-unhealthy": "#ef4444",
        hazard: "#8b5cf6",
      },
    },
  },
  plugins: [],
};
