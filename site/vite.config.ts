import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(import.meta.dirname),
  build: {
    outDir: resolve(import.meta.dirname, "../dist/site"),
    emptyOutDir: false,
    target: "es2022",
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        demo: resolve(import.meta.dirname, "demo/index.html"),
        privacy: resolve(import.meta.dirname, "privacy/index.html"),
        terms: resolve(import.meta.dirname, "terms/index.html"),
        notFound: resolve(import.meta.dirname, "404.html"),
      },
    },
  },
});
