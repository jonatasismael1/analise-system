import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F3F6F5",
        surface: {
          DEFAULT: "#FFFFFF",
          low: "#EDF1F0",
        },
        sidebar: "#192827",
        "sidebar-hover": "#243D3B",
        ink: {
          DEFAULT: "#1A2B2A",
          secondary: "#4E6A68",
          muted: "#7A9490",
        },
        primary: {
          DEFAULT: "#15A898",
          dark: "#0D7A6D",
          wash: "#E4F5F3",
          bright: "#1DC9B5",
        },
        danger: {
          DEFAULT: "#C84A3C",
          wash: "#FEF0EE",
          border: "#F5C4BE",
        },
        success: {
          DEFAULT: "#2B7A50",
          wash: "#E6F4EC",
        },
        warning: {
          DEFAULT: "#B8710F",
          wash: "#FEF5E4",
        },
        border: {
          DEFAULT: "rgba(21, 168, 152, 0.12)",
          strong: "#C4D4D1",
          divider: "#EDF1F0",
        },
        // Aliases de compatibilidade para componentes existentes que usam tokens antigos
        background: "#F3F6F5",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#EDF1F0",
        "surface-container": "#E8ECEA",
        "surface-container-high": "#DFE5E3",
        "surface-variant": "#D4DCDA",
        "on-surface": "#1A2B2A",
        "on-surface-variant": "#4E6A68",
        outline: "#7A9490",
        "outline-variant": "#C4D4D1",
        secondary: "#4E6A68",
        error: "#C84A3C",
        "error-container": "#FEF0EE",
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(25, 40, 39, 0.06)",
        modal: "0 20px 60px rgba(25, 40, 39, 0.22)",
        sidebar: "2px 0 12px rgba(0, 0, 0, 0.15)",
        toast: "0 8px 24px rgba(25, 40, 39, 0.28)",
        "primary-press": "0 3px 8px rgba(21, 168, 152, 0.25)",
        // Aliases de compatibilidade
        clinical: "0 1px 4px rgba(25, 40, 39, 0.06)",
        modal_old: "0 20px 60px rgba(25, 40, 39, 0.22)",
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
