import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "solar-portfolio.ts"),
      formats: ["es"],
      fileName: () => "solar-portfolio.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    minify: "terser",
    rollupOptions: {
      // Three.js is bundled into the output (no externals)
      output: {
        // Keep asset file names predictable
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});

