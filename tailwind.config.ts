import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#0F766E", // Teal 700 - Elegant Quranic Teal
          foreground: "#FFFFFF",
          light: "#14B8A6",
          dark: "#115E59",
        },
        accent: {
          DEFAULT: "#D97706", // Amber 600 - Warm Gold Accent
          foreground: "#FFFFFF",
          light: "#F59E0B",
        },
        islamicGold: {
          DEFAULT: "#B39B59", // Mosque logo signature gold
          50: "#FBF9F2",
          100: "#F5F0E1",
          200: "#EADDC0",
          300: "#DEC89E",
          400: "#D0B27A",
          500: "#B39B59",
          600: "#9C8344",
          700: "#7F6732",
          800: "#604E25",
          900: "#44371A",
          950: "#271F0D",
        },
        card: {
          DEFAULT: "var(--card-bg)",
          foreground: "var(--card-fg)",
        },
        muted: {
          DEFAULT: "#F1F5F9",
          foreground: "#64748B",
        },
        border: "var(--border-color)",
      },
      fontFamily: {
        tajawal: ["var(--font-tajawal)", "sans-serif"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
