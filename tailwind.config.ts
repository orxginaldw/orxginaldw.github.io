import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        header: "oklch(var(--header) / <alpha-value>)",
        search: "oklch(var(--search) / <alpha-value>)",
        footer: "oklch(var(--footer) / <alpha-value>)",
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          hover: "oklch(var(--card-hover) / <alpha-value>)",
        },
        tile: "oklch(var(--tile) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        code: "oklch(var(--code) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          hover: "oklch(var(--primary-hover) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: "oklch(var(--secondary) / <alpha-value>)",
        muted: {
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: "oklch(var(--accent) / <alpha-value>)",
        success: "oklch(var(--success) / <alpha-value>)",
        warning: "oklch(var(--warning) / <alpha-value>)",
        destructive: "oklch(var(--destructive) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Satoshi", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "6px",
      },
      transitionTimingFunction: {
        binwoken: "cubic-bezier(0.22, 0.61, 0.22, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
