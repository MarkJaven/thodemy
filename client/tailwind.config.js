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
          850: "#100f1a",
          800: "#141320",
          750: "#171525",
          700: "#1a1828",
          650: "#1f1d30",
          600: "#252339",
          500: "#2d2a45",
        },
        glass: "rgba(255,255,255,0.08)",
        accent: {
          purple: "#7f5bff",
          indigo: "#6a3df0",
          violet: "#4d24c4",
        },
        status: {
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
          info: "#3b82f6",
        },
      },
      boxShadow: {
        glow: "0 20px 60px rgba(10, 8, 18, 0.6)",
        "glow-sm": "0 8px 24px rgba(10, 8, 18, 0.4)",
        "glow-lg": "0 32px 80px rgba(10, 8, 18, 0.7)",
        card: "0 4px 20px rgba(0, 0, 0, 0.25)",
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.35)",
        "purple-glow": "0 10px 30px rgba(94, 59, 219, 0.35)",
        "purple-glow-lg": "0 15px 40px rgba(94, 59, 219, 0.45)",
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      transitionDuration: {
        "250": "250ms",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
