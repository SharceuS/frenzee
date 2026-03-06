/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        fredoka: ["'Fredoka One'", "cursive"],
        nunito: ["'Nunito'", "sans-serif"],
      },
      colors: {
        party: {
          purple: "#7C3AED",
          pink: "#EC4899",
          yellow: "#FBBF24",
          green: "#10B981",
          orange: "#F97316",
          blue: "#3B82F6",
          red: "#EF4444",
          bg: "#0F0A1E",
          card: "#1A1040",
          border: "#2D1B69",
        },
      },
      animation: {
        "bounce-slow": "bounce 2s infinite",
        wiggle: "wiggle 1s ease-in-out infinite",
        "pop-in": "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        float: "float 3s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        wiggle: {
          "0%,100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        popIn: {
          "0%": { opacity: 0, transform: "scale(0.5)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 20px rgba(124,58,237,0.5)" },
          "50%": {
            boxShadow:
              "0 0 40px rgba(124,58,237,1), 0 0 60px rgba(236,72,153,0.5)",
          },
        },
      },
    },
  },
  plugins: [],
};
