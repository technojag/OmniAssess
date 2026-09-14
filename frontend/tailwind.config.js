/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07080f",
        panel: "#10121c",
        line: "#1e2233",
        accent: "#7c5cff",
        mint: "#3ee0b5",
      },
      fontFamily: {
        sans: ["Sora", "ui-sans-serif", "system-ui"],
        display: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
