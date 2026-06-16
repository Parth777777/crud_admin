import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Lets the client import the SAME zod schemas the server uses.
      "@shared": path.resolve(__dirname, "../shared"),
    },
  },
  server: {
    port: 5173,
    // Allow Vite to read files outside client/ (our ../shared folder).
    fs: { allow: [path.resolve(__dirname, "..")] },
    // Forward any /api/* request from the browser to the Express server,
    // so the client can just call "/api/..." with no host/port/CORS fuss.
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
