import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  base: "/cache-invalidation/",
  server: {
    port: 5175,
    strictPort: true,
  },
});
