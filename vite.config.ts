import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5175,
    host: true,
  },
  preview: {
    port: Number(process.env.PORT) || 5175,
    host: true,
    allowedHosts: "all",
  },
  build: {
    rollupOptions: {
      external: ["express"],
    },
  },
});
