import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Meta CSP in index.html is production-oriented (`script-src 'self'`,
 * `connect-src 'self'`). Vite + React Refresh need a wider script-src in
 * development, and the Vite HMR websocket / optional direct API host need
 * connect-src allowances that must not ship in the production bundle.
 */
function cspForViteDev(): Plugin {
  return {
    name: "afh-csp-vite-dev",
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html;
      return html
        .replace(
          /script-src 'self'/g,
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        )
        .replace(
          /connect-src 'self'/g,
          "connect-src 'self' http://127.0.0.1:8080 http://localhost:8080 ws://localhost:5173 ws://127.0.0.1:5173",
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
  // Keep release-candidate preview behavior aligned with the dev proxy so
  // authenticated Lighthouse/E2E checks exercise the production bundle.
  preview: {
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
