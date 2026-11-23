import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F7F5EF",
          raised: "#FFFFFF",
          subtle: "#EFECE4",
        },
        ink: {
          DEFAULT: "#172D44",
          muted: "#536574",
          faint: "#6E7F8D",
        },
        line: {
          DEFAULT: "#D8DFDF",
          strong: "#B8C4C4",
        },
        blueprint: {
          50: "#E8F3F1",
          100: "#CFE6E3",
          400: "#2B8A83",
          600: "#176B65",
          700: "#10564F",
        },
        rust: {
          50: "#F5E7DB",
          400: "#B8663B",
          600: "#A65429",
        },
        signal: {
          success: "#146C43",
          warning: "#805700",
          danger: "#B42318",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      letterSpacing: {
        wide2: "0.08em",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(23, 45, 68, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
