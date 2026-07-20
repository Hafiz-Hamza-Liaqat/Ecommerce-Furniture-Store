import { useEffect, useState } from "react";

const KEYWORDS = ["homes", "hotels", "workplaces", "hospitality lobbies"] as const;

/** Subtle rotating keyword — fade transition, no typing cursor. */
export function HeroKeywordRotate() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "reduce";
    if (prefersReduced) return;

    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % KEYWORDS.length);
        setVisible(true);
      }, 320);
    }, 4800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={`site-hero__keyword${visible ? " is-visible" : ""}`} aria-live="polite">
      {KEYWORDS[index]}
    </span>
  );
}
