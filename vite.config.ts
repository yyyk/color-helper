import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project site under /<repo>/; the deploy workflow sets BASE_PATH.
  // Locally the app is served from the root.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
