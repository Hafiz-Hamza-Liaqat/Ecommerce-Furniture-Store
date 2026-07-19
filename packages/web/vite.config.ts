import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Meta CSP in index.html is production-oriented (`script-src 'self'`).
 * Vite + React Refresh inject an inline preamble that CSP blocks in
 * development, which can surface as intermittent
 * "Cannot read properties of null (reading 'useState')" during navigation.
 * Loosen script-src only while the Vite dev server is active.
 */
function cspForViteDev(): Plugin {
  return {
    name: "afh-csp-vite-dev",
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html;
      return html.replace(
        /script-src 'self'/g,
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), cspForViteDev()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          // Match path segments — avoid treating "react-router-dom" as "react-dom".
          if (/[/\\]react-router(?:-dom)?[/\\]/.test(id)) return "router";
          if (
            /[/\\]react-dom[/\\]/.test(id) ||
            /[/\\]react[/\\]/.test(id) ||
            /[/\\]scheduler[/\\]/.test(id)
          ) {
            return "react";
          }
          return "vendor";
        },
      },
    },
  },
});
