import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  base: "/offline-first/",
  server: {
    port: 5178,
    strictPort: true,
  },
});
