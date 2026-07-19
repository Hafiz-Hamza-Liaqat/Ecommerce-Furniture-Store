# RC8.5 — Final Test Summary (Pre-Commit Polish)

| Gate | Result |
|---|---|
| `npm run typecheck -w @afh/web` | Pass |
| `npm run lint -w @afh/web` | Pass |
| `npm test -w @afh/web` | Pass — **87/87** |
| `npm run build -w @afh/web` | Pass |
| Demo frame001 / frame072 HTTP | Pass (200) |
| `/products/meridian-sofa` HTTP | Pass (200) |
| Backend / CQRS / Policy | Untouched |

## Focus of this polish

1. Floating Amazon magnifier (no layout push)
2. Isolated 72-frame same-product spin demo
3. Viewer validation against full sequence

**Do not commit** until manual review approval.
