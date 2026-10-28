/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#EEE8DF",
          light: "#F7F4EF",
          dark: "#E2DACD",
        },
        beige: {
          DEFAULT: "#C4BCB0",
          light: "#D8D2C9",
          dark: "#9E9588",
        },
        ocean: {
          DEFAULT: "#2C365A",
          hover: "#222A47",
          active: "#181E34",
          light: "#3E4B7A",
          subtle: "#E5E8F0",
        },
        forest: {
          DEFAULT: "#1E4D3B",
          hover: "#163B2D",
          light: "#2A6B52",
          subtle: "#E3EFEA",
        },
        slatepig: {
          DEFAULT: "#5C6F73",
          light: "#7A8E93",
        },
        background: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-raised": "var(--color-surface-raised)",
        border: "var(--color-border)",
        "border-input": "var(--color-border-input)",
        foreground: "var(--color-text)",
        muted: "var(--color-text-muted)",
        subtle: "var(--color-text-subtle)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          foreground: "var(--color-on-primary)",
          subtle: "var(--color-primary-subtle)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
    },
  },
  plugins: [],
};
