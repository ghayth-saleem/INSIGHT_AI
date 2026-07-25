import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base dark theme
        bg: {
          primary: "#07070f",
          sidebar: "#09090f",
          card: "#0f0f1a",
          hover: "#14142a",
        },
        // Accent colors
        amber: {
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
        },
        // Module-specific accents
        module: {
          if: "#22d3ee",      // cyan - Isolation Forest
          dnn: "#a78bfa",     // violet - DNN
          prophet: "#fb7185", // rose - Prophet
          arabert: "#34d399", // emerald - AraBERT
        },
        // Text
        text: {
          primary: "#e2e2e6",
          secondary: "#8a8a9a",
          muted: "#52525e",
        },
        // Borders
        border: {
          subtle: "#1a1a2e",
          active: "#2a2a3e",
        },
      },
      fontFamily: {
        heading: ["Syne", "sans-serif"],
        mono: ["Space Mono", "monospace"],
        body: ["Space Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
