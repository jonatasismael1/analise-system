import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f7f9fb",
        surface: "#f7f9fb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f6",
        "surface-container": "#eceef0",
        "surface-container-high": "#e6e8ea",
        "surface-variant": "#e0e3e5",
        "on-surface": "#191c1e",
        "on-surface-variant": "#3e4947",
        outline: "#6e7977",
        "outline-variant": "#bdc9c6",
        primary: {
          DEFAULT: "#0f766e",
          ink: "#005c55",
          dark: "#115e59",
          soft: "#ccfbf1"
        },
        secondary: "#515f74",
        error: "#ba1a1a",
        "error-container": "#ffdad6"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        clinical: "0 4px 12px rgba(15, 118, 110, 0.05)",
        modal: "0 10px 25px rgba(51, 65, 85, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
