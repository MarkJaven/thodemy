/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
      },
      colors: {
        ink: {
          900: "#0c0b14",
          800: "#141320",
          700: "#1a1828",
          600: "#252339",
        },
        glass: "rgba(255,255,255,0.08)",
      },
      boxShadow: {
        glow: "0 20px 60px rgba(10, 8, 18, 0.6)",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
