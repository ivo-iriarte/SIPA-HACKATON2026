/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#F4EFE3", // Trigo: fondo principal
          light: "#FBF8F0",   // Crema: superficies y paneles
          dark: "#E8DFCE",
        },
        beige: {
          DEFAULT: "#D6C8AE", // Arena: bordes y divisores
          light: "#E4DAC6",
          dark: "#B5A589",
        },
        ocean: {
          DEFAULT: "#43533D", // Oliva profundo: navegación y acciones principales
          hover: "#364431",
          active: "#2B3727",
          light: "#566647",
          subtle: "#EAEEE6",
        },
        forest: {
          DEFAULT: "#566647", // Oliva suave: estados productivos
          hover: "#43533D",
          light: "#697B58",
          subtle: "#EAEEE6",
        },
        slatepig: {
          DEFAULT: "#6B543B", // Nogal: acento cálido
          light: "#856B4E",
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
