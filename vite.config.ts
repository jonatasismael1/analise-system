import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Clinic Pro",
        short_name: "ClinicPro",
        description: "Sistema de Gestão Clínica",
        theme_color: "#0f766e",
        background_color: "#f0fdf4",
        display: "standalone",
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192 512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
