import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // "Drafting paper" neutral background — cool, not warm cream
        paper: {
          DEFAULT: "#F4F5F3",
          raised: "#FFFFFF",
        },
        // Ink — near-black with a blue undertone, used for text
        ink: {
          DEFAULT: "#10161D",
          muted: "#4B5563",
          faint: "#8A9099",
        },
        // Hairline borders / dividers
        line: {
          DEFAULT: "#DADCD8",
          strong: "#B7BAB4",
        },
        // Primary accent — "blueprint" navy, used sparingly for actions/links
        blueprint: {
          50: "#EEF2F6",
          100: "#D6E0EA",
          400: "#3E6690",
          600: "#1D3557",
          700: "#152740",
        },
        // Secondary accent — muted rust, reserved for warnings / CO2 emphasis
        rust: {
          50: "#FBF1EC",
          400: "#B45536",
          600: "#8C3D22",
        },
        signal: {
          success: "#2F6F4E",
          warning: "#9A6B12",
          danger: "#A3312A",
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
        panel: "0 1px 2px rgba(16, 22, 29, 0.04), 0 1px 0 rgba(16, 22, 29, 0.03)",
      },
    },
  },
  plugins: [],
};

export default config;
