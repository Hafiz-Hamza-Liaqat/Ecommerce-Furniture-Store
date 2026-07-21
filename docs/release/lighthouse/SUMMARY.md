# Lighthouse audit results

- Base URL: http://127.0.0.1:4173
- Generated: 2026-07-21T00:31:43.375Z

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| home | 93 | 97 | 96 | 100 |
| category | 89 | 97 | 96 | 100 |
| product | 89 | 97 | 96 | 100 |
| login | 93 | 95 | 96 | 66 |

## Targets

- Performance ≥ 90
- Accessibility ≥ 95
- Best Practices ≥ 95
- SEO ≥ 95

## Gate

- PASS home performance: 93
- PASS home accessibility: 97
- PASS home best-practices: 96
- PASS home seo: 100
- FAIL category performance: 89 (need ≥ 90)
- PASS category accessibility: 97
- PASS category best-practices: 96
- PASS category seo: 100
- FAIL product performance: 89 (need ≥ 90)
- PASS product accessibility: 97
- PASS product best-practices: 96
- PASS product seo: 100
- SKIP login seo: 66 (robots Disallow — intentional for auth)
- PASS login performance: 93
- PASS login accessibility: 95
- PASS login best-practices: 96
