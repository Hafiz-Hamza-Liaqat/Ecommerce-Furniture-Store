# 10 — Animation & Interaction Recommendations

- **Audit ID:** RC8.0-CX-10
- **Constraint:** Recommend **ONE** premium animation system. Do not mix libraries/styles.

## 1. Current state

| Mechanism | Where | Notes |
|---|---|---|
| Custom CSS keyframes | `marketing.css` | Hero zoom, shimmer skeleton, booklet curl, particle drift, reveal |
| `useReveal` IntersectionObserver | Home | Opacity/transform sections |
| Page transition | MarketingShell 280ms skeleton | Artificial delay |
| Hover lifts | Product/category/project cards | `transform` 200ms |
| Booklet interactions | Drag page turn, hotspots | Custom |
| Reduced motion | CSS media query | Good start |
| Framer Motion / GSAP / Lottie | — | **Not used** |

**Problem:** Multiple ad-hoc motions (hero zoom + particles + curl + shimmer) risk feeling busy rather than luxury-minimal.

## 2. Recommended single system

| Decision | Choice |
|---|---|
| **Primary library** | **Motion One** (`motion`) *or* CSS-first with a thin `motion` wrapper — pick **one**. Recommendation: **CSS + Motion One** for orchestrated reveals only |
| **Avoid mixing** | Do not add GSAP + Framer + Lottie simultaneously |
| **Character** | Premium · elegant · luxury · fast · professional · minimal |
| **Duration** | Micro: **120–180ms**; UI: **200–280ms**; section reveal: **400–600ms**; hero ambient: ≤1 subtle effect |
| **Easing** | Standard: `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out expo-ish); exits slightly faster |
| **Distance** | Reveals: **12–20px** Y translate max; cards lift **4px** |

## 3. Where to apply (canonical)

| Surface | Motion | Notes |
|---|---|---|
| Hero | One subtle ken-burns **or** fade-in content — not both + particles | Reduce current hero zoom intensity |
| Sections | Scroll reveal once (opacity + Y) | Reuse `useReveal` pattern |
| Cards | Hover lift + image scale 1.03 | Consistent everywhere |
| Product hover | Image crossfade if second angle exists | Needs media |
| Buttons | Background/color 160ms; no bounce | |
| Mega menu | Fade + 8px Y; 180ms | Intent delay 100ms open |
| Image loading | LQIP blur → sharp; no shimmer carnival | |
| Gallery | Crossfade 200ms; zoom lens separate | |
| Page transitions | Optional view fade 200ms; drop fake 280ms wait when data is local | |
| Scroll reveal | Once; respect reduced motion | |
| Counters | Optional count-up only if in view; ≤800ms | Home stats currently static text |
| Testimonials | Fade carousel; no 3D flips | |
| Sliders / booklet | Keep drag; tone down particles | |
| FAQ | Height animate details carefully or native | |
| Forms | Success state fade | |
| Recommendations | Stagger 40ms | |

## 4. Hover effects audit

| Element | Current | Gap |
|---|---|---|
| Nav links | Underline/color | OK |
| Mega links | Basic | Need clearer hierarchy hover |
| Product cards | Lift | Missing image swap / wishlist icon |
| Category tiles | Lift | OK baseline |
| Buttons | Transform/background | Consistent |
| Gallery thumbs | None interactive | **Missing** |
| Recommendations | N/A | **Missing** |

**Inconsistency:** Booklet is highly animated; PDP is static — feels like two products.

## 5. Performance & a11y

- Prefer `transform`/`opacity`; avoid layout thrash.
- Pause ambient animations when tab hidden.
- **`prefers-reduced-motion: reduce`:** instant states; no auto-play spin/hero zoom.
- Cap simultaneous animations (stagger queues).

## 6. Gap record

| Field | Value |
|---|---|
| **Current status** | Partial — custom CSS, uneven luxury signal |
| **Why it matters** | Motion is brand; mixed styles feel amateur |
| **Recommended implementation** | Adopt single motion tokens + Motion One for orchestration; delete redundant particle/curl noise on default path |
| **Dependencies** | Design tokens; Phase A gallery/nav |
| **Priority** | **High** |

## 7. Verdict

Standardize on **one** minimal luxury motion language (CSS tokens + optional Motion One). Refine, don’t stack libraries.
