import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        accent: {
          violet: "#8B5CF6",
          cyan: "#06B6D4",
          magenta: "#EC4899",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-mesh": "radial-gradient(at 40% 20%, var(--tw-gradient-from) 0%, transparent 50%), radial-gradient(at 80% 0%, var(--tw-gradient-from) 0%, transparent 50%), radial-gradient(at 0% 50%, var(--tw-gradient-from) 0%, transparent 50%)",
        "gradient-ai": "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 50%, #EC4899 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.2)",
        float: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        "float-lg": "0 35px 60px -15px rgba(0, 0, 0, 0.3)",
        glow: "0 0 40px -10px rgba(139, 92, 246, 0.5)",
        "glow-cyan": "0 0 40px -10px rgba(6, 182, 212, 0.5)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "gradient-shift": "gradient-shift 8s ease infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out forwards",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
