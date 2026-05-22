import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design 2.0 — paleta azul/slate profissional
        canvas: "#f8fafc",        // slate-50 — fundo principal
        surface: {
          DEFAULT: "#ffffff",
          low: "#f1f5f9",         // slate-100
        },
        sidebar: "#ffffff",        // sidebar limpa branca
        "sidebar-hover": "#f8fafc",
        ink: {
          DEFAULT: "#0f172a",     // slate-900
          secondary: "#475569",   // slate-600
          muted: "#94a3b8",       // slate-400
        },
        primary: {
          DEFAULT: "#2563eb",     // blue-600
          dark: "#1d4ed8",        // blue-700
          wash: "#eff6ff",        // blue-50
          bright: "#3b82f6",      // blue-500
        },
        danger: {
          DEFAULT: "#ef4444",     // red-500
          wash: "#fee2e2",        // red-100
          border: "#fecaca",      // red-200
        },
        success: {
          DEFAULT: "#22c55e",     // green-500
          wash: "#dcfce7",        // green-100
        },
        warning: {
          DEFAULT: "#f59e0b",     // amber-500
          wash: "#fef3c7",        // amber-100
        },
        info: {
          DEFAULT: "#0ea5e9",     // sky-500
          wash: "#e0f2fe",        // sky-100
        },
        border: {
          DEFAULT: "#e2e8f0",     // slate-200
          strong: "#cbd5e1",      // slate-300
          divider: "#f1f5f9",     // slate-100
        },
        // Aliases de compatibilidade para componentes existentes
        background: "#f8fafc",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f1f5f9",
        "surface-container": "#e2e8f0",
        "surface-container-high": "#cbd5e1",
        "surface-variant": "#cbd5e1",
        "on-surface": "#0f172a",
        "on-surface-variant": "#475569",
        outline: "#94a3b8",
        "outline-variant": "#cbd5e1",
        secondary: "#475569",
        error: "#ef4444",
        "error-container": "#fee2e2",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "14px",
        "2xl": "18px",
        "3xl": "24px",
        "4xl": "32px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        modal: "0 20px 60px rgba(15, 23, 42, 0.18)",
        sidebar: "1px 0 0 #e2e8f0",
        toast: "0 8px 24px rgba(15, 23, 42, 0.18)",
        "primary-press": "0 3px 8px rgba(37, 99, 235, 0.25)",
        // aliases de compatibilidade
        clinical: "0 1px 3px rgba(15, 23, 42, 0.06)",
        modal_old: "0 20px 60px rgba(15, 23, 42, 0.18)",
      },
      animation: {
        shimmer: "shimmer 1.4s ease-in-out infinite",
        "fade-in": "fadeIn 200ms ease-out",
        "slide-in-right": "slideInRight 280ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
