const animate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
module.exports = {
  // ── Dark mode via class on <html> ──────────────────────────────────────────
  darkMode: "class",

  content: ["./index.html", "./src/**/*.{ts,tsx}"],

  theme: {
    extend: {
      // ── CSS-var driven semantic colors ─────────────────────────────────────
      colors: {
        // Shadcn compatibility
        border:     "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Dari semantic tokens — use these in components
        theme: {
          bg:        "var(--bg)",
          secondary: "var(--bg-secondary)",
          surface:   "var(--surface)",
          surface2:  "var(--surface2)",
          border:    "var(--border)",
          text:      "var(--text)",
          muted:     "var(--text-muted)",
          faint:     "var(--text-faint)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover:   "var(--accent-hover)",
          light:   "var(--accent-light)",
          text:    "var(--accent-text)",
        },
        "accent2": {
          DEFAULT: "var(--accent2)",
          light:   "var(--accent2-light)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          light:   "var(--gold-light)",
        },
      },

      // ── Shadows using CSS vars ──────────────────────────────────────────────
      boxShadow: {
        "theme-sm": "var(--shadow-sm)",
        "theme-md": "var(--shadow-md)",
        "theme-lg": "var(--shadow-lg)",
        "theme-xl": "var(--shadow-xl)",
      },

      fontFamily: {
        sans: ["Geist Variable", "system-ui", "sans-serif"],
      },
    },
  },

  plugins: [animate],
};