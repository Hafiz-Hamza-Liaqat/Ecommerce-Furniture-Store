# Production deployment validation

Checklist for the edge / reverse-proxy / hosting layer in front of `@afh/runtime-host` and the static web build. The Node API already emits baseline security headers (`x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`, COOP/CORP).

| Item | Owner | Status | Evidence |
|---|---|---|---|
| HTTPS (TLS 1.2+) | Ops | ☐ | |
| HSTS | Ops | ☐ | Header on HTTPS only |
| Compression (Brotli and/or Gzip) | Ops | ☐ | HTML/JS/CSS |
| Caching (immutable hashed assets; short HTML) | Ops | ☐ | Cache-Control |
| Image optimization / CDN | Ops | ☐ | |
| Security headers on SPA origin | Ops | ☐ | Align with API headers |
| CSP (production) | Ops | ☐ | Prefer header over meta; nonce/hash for scripts |
| `robots.txt` | App | ☑ | Served from web `public/` |
| Sitemap | App | ☑ | Expanded in RC8.3 |
| Custom 404 (SPA) | App | ☑ | Enterprise not-found route |
| Custom 500 / error boundary | App | ☑ | `RouteAwareErrorBoundary` + API JSON errors |
| Analytics | Product | ☐ | Wire vendor after domain cutover |
| Monitoring / health | Ops | ☑ | `/health/live`, `/health/ready` |
| Error reporting | Ops | ☐ | Optional Sentry/etc. |
| Backups | Ops | ☑ | `scripts/backup-sqlite.sh` + DR docs |
| Rate limiting | Ops / App | ☐ | Confirm edge + API hooks |

## Suggested nginx / CDN notes

- Proxy `/api` and `/health` to the runtime host.
- Serve `packages/web/dist` as the SPA with `try_files $uri /index.html`.
- Enable `gzip` / `brotli` for text assets; long-cache `/assets/*`.
- Set CSP / HSTS at the edge so Vite meta CSP can stay conservative.
