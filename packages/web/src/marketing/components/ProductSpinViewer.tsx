import { useEffect, useRef, useState } from "react";

type Props = {
  readonly frames: readonly string[];
  readonly productName: string;
};

/**
 * 360° Product Viewer — image-sequence spin with inertia.
 * data-future-glb keeps a GLB/3D replacement hook without redesign.
 */
export function ProductSpinViewer({ frames, productName }: Props) {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const inertiaRaf = useRef<number | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    setReady(false);
    for (const url of frames) {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded += 1;
        if (!cancelled && loaded >= frames.length) setReady(true);
      };
      img.src = url;
    }
    if (frames.length === 0) setReady(true);
    return () => {
      cancelled = true;
    };
  }, [frames]);

  useEffect(() => {
    if (!auto || frames.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % frames.length);
    }, 100);
    return () => window.clearInterval(id);
  }, [auto, frames.length]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    return () => {
      if (inertiaRaf.current != null) cancelAnimationFrame(inertiaRaf.current);
    };
  }, []);

  function stopInertia() {
    if (inertiaRaf.current != null) {
      cancelAnimationFrame(inertiaRaf.current);
      inertiaRaf.current = null;
    }
    velocity.current = 0;
  }

  function startInertia() {
    if (frames.length < 2) return;
    stopInertia();
    const tick = () => {
      if (Math.abs(velocity.current) < 0.15) {
        velocity.current = 0;
        inertiaRaf.current = null;
        return;
      }
      const step = velocity.current > 0 ? 1 : -1;
      setIndex((i) => (i + step + frames.length) % frames.length);
      velocity.current *= 0.92;
      inertiaRaf.current = requestAnimationFrame(tick);
    };
    inertiaRaf.current = requestAnimationFrame(tick);
  }

  function scrub(clientX: number) {
    if (frames.length < 2) return;
    const delta = clientX - lastX.current;
    if (Math.abs(delta) < 6) return;
    lastX.current = clientX;
    velocity.current = delta / 8;
    setIndex((i) => (i + (delta > 0 ? 1 : -1) + frames.length) % frames.length);
  }

  function resetView() {
    stopInertia();
    setAuto(false);
    setIndex(0);
  }

  if (!frames.length) {
    return (
      <p className="cx-spin__empty" role="status">
        360° frames are not available for this product yet.
      </p>
    );
  }

  const frame = frames[index] ?? frames[0]!;

  const stage = (
    <div
      className="cx-spin__stage"
      role="img"
      aria-label={`${productName} 360 degree view, frame ${index + 1} of ${frames.length}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setIndex((i) => (i + 1) % frames.length);
        if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + frames.length) % frames.length);
        if (e.key === "Home" || e.key === "0") resetView();
        if (e.key === "Escape" && fullscreen) setFullscreen(false);
      }}
      onMouseDown={(e) => {
        stopInertia();
        dragging.current = true;
        lastX.current = e.clientX;
        setAuto(false);
      }}
      onMouseMove={(e) => {
        if (!dragging.current) return;
        scrub(e.clientX);
      }}
      onMouseUp={() => {
        if (!dragging.current) return;
        dragging.current = false;
        startInertia();
      }}
      onMouseLeave={() => {
        if (!dragging.current) return;
        dragging.current = false;
        startInertia();
      }}
      onTouchStart={(e) => {
        stopInertia();
        dragging.current = true;
        lastX.current = e.touches[0]?.clientX ?? 0;
        setAuto(false);
      }}
      onTouchMove={(e) => {
        if (!dragging.current) return;
        scrub(e.touches[0]?.clientX ?? lastX.current);
      }}
      onTouchEnd={() => {
        dragging.current = false;
        startInertia();
      }}
    >
      {!ready ? (
        <div className="cx-spin__spinner" role="status" aria-live="polite">
          <span className="cx-spin__spinner-ring" aria-hidden="true" />
          <span>Loading 360°</span>
        </div>
      ) : null}
      <img
        src={frame}
        alt=""
        draggable={false}
        className={`cx-spin__img${ready ? " is-ready" : ""}`}
      />
      <p className="cx-spin__hint">Drag to rotate · inertia · Esc exits fullscreen · Reset available</p>
    </div>
  );

  return (
    <div className="cx-spin" data-viewer="spin-sequence" data-future-glb="ready">
      <div className="cx-spin__toolbar">
        <button
          type="button"
          className="site-btn site-btn--ghost"
          aria-pressed={auto}
          onClick={() => {
            stopInertia();
            setAuto((v) => !v);
          }}
        >
          {auto ? "Pause auto-spin" : "Auto-spin"}
        </button>
        <button type="button" className="site-btn site-btn--ghost" onClick={resetView}>
          Reset
        </button>
        <button type="button" className="site-btn site-btn--ghost" onClick={() => setFullscreen(true)}>
          Fullscreen
        </button>
      </div>
      {stage}
      {fullscreen ? (
        <div
          className="cx-gallery__fs"
          role="dialog"
          aria-modal="true"
          aria-label="360 fullscreen"
          onClick={() => setFullscreen(false)}
        >
          <div className="cx-gallery__fs-inner" onClick={(e) => e.stopPropagation()}>
            {stage}
            <button type="button" className="site-btn site-btn--primary" onClick={() => setFullscreen(false)}>
              Close (Esc)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
