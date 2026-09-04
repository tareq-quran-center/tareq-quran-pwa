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
          DEFAULT: "#7A0C1E", // Royal Islamic Burgundy
          foreground: "#FFFFFF",
          light: "#9B162C",
          dark: "#590714",
        },
        burgundy: {
          DEFAULT: "#7A0C1E",
          50: "#FDF2F4",
          100: "#FCE7EA",
          200: "#F9D1D7",
          300: "#F4ABB6",
          400: "#EC7A8D",
          500: "#DF4763",
          600: "#C52646",
          700: "#9E1834",
          800: "#7A0C1E",
          900: "#5B0815",
          950: "#38040B",
        },
        accent: {
          DEFAULT: "#D4AF37", // Metallic Gold Accent
          foreground: "#FFFFFF",
          light: "#DFC274",
        },
        islamicGold: {
          DEFAULT: "#D4AF37", // Signature logo metallic gold
          50: "#FDFBF5",
          100: "#FAF4E4",
          200: "#F4E7C4",
          300: "#EBD69E",
          400: "#DFC274",
          500: "#D4AF37",
          600: "#B88F28",
          700: "#916B1B",
          800: "#73521A",
          900: "#4A3412",
          950: "#2A1C08",
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
