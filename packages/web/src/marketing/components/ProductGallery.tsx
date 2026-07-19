import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type GalleryItem = {
  readonly id: string;
  readonly type: "image" | "video";
  readonly url: string;
  readonly alt: string;
};

type Props = {
  readonly items: readonly GalleryItem[];
  readonly productName: string;
};

/**
 * Production Amazon-style gallery: thumbs, dual-pane magnifier, pinch zoom,
 * fullscreen, swipe, keyboard, preload.
 */
export function ProductGallery({ items, productName }: Props) {
  const all = useMemo(() => {
    const images = items.filter((i) => i.type === "image");
    const videos = items.filter((i) => i.type === "video");
    return [...images, ...videos];
  }, [items]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoverZoom, setHoverZoom] = useState(false);
  const [lens, setLens] = useState({ x: 50, y: 50 });
  const [pinchScale, setPinchScale] = useState(1);
  const touchStart = useRef<number | null>(null);
  const pinchStart = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const current = all[index] ?? all[0];

  useEffect(() => {
    setLoaded(false);
    setPinchScale(1);
  }, [index, current?.url]);

  // Preload neighbors + first few images
  useEffect(() => {
    const candidates = [all[index + 1], all[index - 1], all[index + 2], all[0], all[1]];
    const urls = candidates
      .filter((x): x is GalleryItem => x != null && x.type === "image")
      .map((x) => x.url);
    for (const url of [...new Set(urls)]) {
      const img = new Image();
      img.src = url;
    }
  }, [index, all]);

  const go = useCallback(
    (dir: number) => {
      if (!all.length) return;
      setIndex((i) => (i + dir + all.length) % all.length);
    },
    [all.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (fullscreen && e.key === "Escape") {
        setFullscreen(false);
        return;
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) setFullscreen(true);
      if (e.key === "+" || e.key === "=") setPinchScale((s) => Math.min(3, s + 0.25));
      if (e.key === "-" || e.key === "_") setPinchScale((s) => Math.max(1, s - 0.25));
      if (e.key === "0") setPinchScale(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, go]);

  function touchDistance(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }): number {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  if (!current) {
    return (
      <div className="cx-gallery cx-gallery--empty" role="status">
        No media available.
      </div>
    );
  }

  const showDualPane = hoverZoom && current.type === "image" && pinchScale <= 1.05;

  return (
    <div className={`cx-gallery${showDualPane ? " cx-gallery--dual" : ""}`}>
      <div className="cx-gallery__thumbs" role="tablist" aria-label={`${productName} thumbnails`}>
        {all.map((item, i) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={`cx-gallery__thumb${i === index ? " is-active" : ""}`}
            onClick={() => setIndex(i)}
          >
            {item.type === "video" ? (
              <span className="cx-gallery__thumb-label">Video</span>
            ) : (
              <img src={item.url} alt="" loading="lazy" />
            )}
          </button>
        ))}
      </div>

      <div
        ref={stageRef}
        className={`cx-gallery__stage${hoverZoom || pinchScale > 1 ? " is-zoom" : ""}`}
        onMouseEnter={() => current.type === "image" && setHoverZoom(true)}
        onMouseLeave={() => setHoverZoom(false)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setLens({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
          });
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            pinchStart.current = touchDistance(e.touches[0]!, e.touches[1]!);
            touchStart.current = null;
            return;
          }
          touchStart.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchStart.current) {
            e.preventDefault();
            const dist = touchDistance(e.touches[0]!, e.touches[1]!);
            const next = Math.min(3, Math.max(1, dist / pinchStart.current));
            setPinchScale(next);
            setHoverZoom(false);
          }
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2) pinchStart.current = null;
          const start = touchStart.current;
          touchStart.current = null;
          if (start == null || pinchScale > 1.05) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (delta < -40) go(1);
          if (delta > 40) go(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
        tabIndex={0}
        role="region"
        aria-label={`${productName} media`}
      >
        {!loaded ? <div className="cx-gallery__skeleton" aria-hidden="true" /> : null}
        {current.type === "video" ? (
          <video
            key={current.id}
            className="cx-gallery__media"
            src={current.url}
            controls
            onLoadedData={() => setLoaded(true)}
          >
            <track kind="captions" />
          </video>
        ) : (
          <img
            key={current.id}
            className="cx-gallery__media"
            src={current.url}
            alt={current.alt || productName}
            loading={index === 0 ? "eager" : "lazy"}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            style={
              pinchScale > 1.05
                ? {
                    transformOrigin: `${lens.x}% ${lens.y}%`,
                    transform: `scale(${pinchScale})`,
                  }
                : hoverZoom
                  ? {
                      transformOrigin: `${lens.x}% ${lens.y}%`,
                      transform: "scale(1.65)",
                    }
                  : undefined
            }
          />
        )}
        {hoverZoom && current.type === "image" && pinchScale <= 1.05 ? (
          <div
            className="cx-gallery__lens"
            style={{ left: `${lens.x}%`, top: `${lens.y}%` }}
            aria-hidden="true"
          />
        ) : null}
        <div className="cx-gallery__controls">
          <button type="button" className="site-btn site-btn--ghost" onClick={() => go(-1)}>
            Prev
          </button>
          <button type="button" className="site-btn site-btn--ghost" onClick={() => go(1)}>
            Next
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => setPinchScale(1)}
            disabled={pinchScale <= 1}
          >
            Reset zoom
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => setFullscreen(true)}
          >
            Fullscreen
          </button>
        </div>
        <p className="cx-gallery__hint">
          Hover to magnify · Pinch to zoom · ← → keys · F fullscreen
        </p>
      </div>

      {showDualPane ? (
        <div
          className="cx-gallery__pane"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${current.url})`,
            backgroundPosition: `${lens.x}% ${lens.y}%`,
            backgroundSize: "250%",
          }}
        />
      ) : null}

      {fullscreen ? (
        <div
          className="cx-gallery__fs"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen gallery"
          onClick={() => setFullscreen(false)}
        >
          <div className="cx-gallery__fs-inner" onClick={(e) => e.stopPropagation()}>
            {current.type === "video" ? (
              <video src={current.url} controls autoPlay className="cx-gallery__fs-media">
                <track kind="captions" />
              </video>
            ) : (
              <img src={current.url} alt={current.alt || productName} className="cx-gallery__fs-media" />
            )}
            <div className="cx-gallery__controls">
              <button type="button" className="site-btn site-btn--ghost" onClick={() => go(-1)}>
                Prev
              </button>
              <button type="button" className="site-btn site-btn--ghost" onClick={() => go(1)}>
                Next
              </button>
              <button
                type="button"
                className="site-btn site-btn--primary"
                onClick={() => setFullscreen(false)}
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
