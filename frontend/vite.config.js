import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/items": "http://localhost:5000", // forward /items requests to Flask backend
    },
  },
});
