import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],


  server: {
    host: '0.0.0.0',       // ← Added
    allowedHosts: true,   // ← Added
    port: 3000,
    proxy: {
      "/api": {
        //target: "http://localhost:8080",
        target: "https://zero203-3070.onrender.com",
        changeOrigin: true,
      },
    },
  },
});
