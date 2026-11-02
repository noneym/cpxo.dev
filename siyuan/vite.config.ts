import { defineConfig } from "vite";

// SiYuan loads index.js as CommonJS and takes module.exports.default.
export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    lib: { entry: "src/index.ts", formats: ["cjs"], fileName: () => "index.js" },
    rollupOptions: { external: ["siyuan"] },
  },
});
