import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#09090b",
        surface: "#18181b",
        "surface-2": "#1f1f23",
        border: "#27272a",
        "border-strong": "#3f3f46",
        text: "#f4f4f5",
        "text-muted": "#a1a1aa",
        "text-dim": "#71717a",
        accent: "#2D9B72",
        "accent-hover": "#35b385",
        positive: "#22c55e",
        negative: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02)",
      },
    },
  },
  plugins: [],
} satisfies Config;
