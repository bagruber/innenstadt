import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // GitHub Pages (Repo-Name) und moosburg.eu liegen beide unter /innenstadt/,
  // deshalb genügt ein Build. Bekommt das Projekt eine eigene Domain, wird
  // daraus "/" für diese Ausspielung, siehe PLATTFORM.md.
  base: "/innenstadt/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
