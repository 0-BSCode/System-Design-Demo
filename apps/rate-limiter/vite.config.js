import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: "/rate-limiter/",
  server: {
    port: 5174,
    strictPort: true,
  },
});
