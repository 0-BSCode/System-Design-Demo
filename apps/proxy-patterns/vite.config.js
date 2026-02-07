import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: "/proxy-patterns/",
  server: {
    port: 5176,
    strictPort: true,
  },
});
