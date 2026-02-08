import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  base: "/queue-workers/",
  server: {
    port: 5177,
    strictPort: true,
  },
});
