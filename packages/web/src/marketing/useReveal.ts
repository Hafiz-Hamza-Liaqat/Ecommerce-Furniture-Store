import { useEffect } from "react";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function revealRoots(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(".site-reveal"),
    ...document.querySelectorAll<HTMLElement>(".cx-stagger:not(.site-reveal .cx-stagger)"),
  ];
}

function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  // Generous: anything touching or near the viewport should show immediately.
  return rect.bottom > -80 && rect.top < vh + 80;
}

/**
 * Unified scroll reveal (RC9.1).
 * - Observes `.site-reveal` and standalone `.cx-stagger` roots
 * - Reveals once (unobserves after visible)
 * - Immediately reveals near-viewport nodes (avoids Suspense / SPA races)
 * - Safety timeout so catalogue grids never stay stuck at opacity 0
 * - Honors prefers-reduced-motion (instant visible)
 */
export function useReveal(deps: unknown[] = []) {
  useEffect(() => {
    let cancelled = false;
    let io: IntersectionObserver | null = null;
    let raf1 = 0;
    let raf2 = 0;
    let safety = 0;

    const markVisible = (el: HTMLElement) => {
      el.classList.add("is-visible");
      io?.unobserve(el);
    };

    const bind = () => {
      if (cancelled) return;
      const nodes = revealRoots().filter((n) => !n.classList.contains("is-visible"));
      if (nodes.length === 0) return;

      if (prefersReducedMotion()) {
        for (const n of nodes) n.classList.add("is-visible");
        return;
      }

      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            markVisible(entry.target as HTMLElement);
          }
        },
        { threshold: 0, rootMargin: "80px 0px 80px 0px" },
      );

      for (const n of nodes) {
        if (isInViewport(n)) markVisible(n);
        else io.observe(n);
      }

      // Never leave listing content invisible after SPA navigation.
      safety = window.setTimeout(() => {
        if (cancelled) return;
        for (const n of revealRoots()) {
          if (!n.classList.contains("is-visible")) n.classList.add("is-visible");
        }
      }, 450);
    };

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(bind);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(safety);
      io?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls re-bind via deps
  }, deps);
}
