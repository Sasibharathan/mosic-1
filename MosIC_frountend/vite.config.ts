import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    port: 3000,
    proxy: {
      "/api": {
        target: "https://zero203-3070.onrender.com",
        changeOrigin: true,
      },
    },
  },
  // ← ADD THIS for production build
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        }
      }
    }
  }
});
