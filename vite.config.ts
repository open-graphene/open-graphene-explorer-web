import { sourceResolution } from "@mirrorboards-utils/mirrorboards-utils-workspace-source/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  plugins: [
    sourceResolution(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    vanillaExtractPlugin(),
    react(),
  ],
});
