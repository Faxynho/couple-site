import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FDF6EE",
        beige: "#F1E4D3",
        blush: "#F6D3DE",
        lilac: "#DFCBF0",
        skymist: "#C9E0F2",
        sage: "#C7DBC9",
        ink: "#4A3F45",
        "ink-soft": "#7A6C72",
        rose: "#E893AA",
        "rose-deep": "#D9758F",
        periwinkle: "#8FB0DE",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.75rem",
        xl3: "2.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(74, 63, 69, 0.18)",
        glow: "0 0 0 1px rgba(255,255,255,0.5), 0 20px 40px -20px rgba(217, 117, 143, 0.35)",
      },
      backgroundImage: {
        "cozy-gradient": "linear-gradient(135deg, #FDF6EE 0%, #F6D3DE 45%, #C9E0F2 100%)",
        "card-gradient": "linear-gradient(160deg, rgba(255,255,255,0.75), rgba(255,255,255,0.35))",
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        heartbeat: {
          "0%, 100%": { strokeDashoffset: "0", opacity: "0.55" },
          "50%": { strokeDashoffset: "24", opacity: "1" },
        },
      },
      animation: {
        floaty: "floaty 4.5s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "pop-in": "pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shimmer: "shimmer 2.2s linear infinite",
        heartbeat: "heartbeat 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
