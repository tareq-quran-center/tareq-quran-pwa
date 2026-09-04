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
          DEFAULT: "#670C1A", // العنابي / الخمري الملكي
          foreground: "#FFFFFF",
          light: "#8B182B",
          dark: "#4A0812",
        },
        burgundy: {
          DEFAULT: "#670C1A",
          50: "#FAF7F2",
          100: "#FDFBF7",
          200: "#F5E6E8",
          300: "#E8BFC5",
          400: "#D48B96",
          500: "#BA5565",
          600: "#9A2A3D",
          700: "#801828",
          800: "#670C1A",
          900: "#520914",
          950: "#36040C",
        },
        accent: {
          DEFAULT: "#C5A059", // الذهبي الأنيق
          foreground: "#FFFFFF",
          light: "#D4AF37",
        },
        islamicGold: {
          DEFAULT: "#C5A059", // الذهبي الأنيق للشعار
          50: "#FDFBF7",
          100: "#FAF7F2",
          200: "#F4EBD8",
          300: "#E9D7B1",
          400: "#D9BE84",
          500: "#C5A059",
          600: "#AA843D",
          700: "#88652A",
          800: "#6B4E22",
          900: "#4B3517",
          950: "#2B1E0C",
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
