import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusTrap } from "../../a11y/useFocusTrap";
import {
  computeMagnifierLayout,
  resolveZoomUrl,
  type GalleryMediaItem,
  type MagnifierLayout,
} from "../media";

export type GalleryItem = GalleryMediaItem;

type Props = {
  readonly items: readonly GalleryItem[];
  readonly productName: string;
};

type LensState = {
  readonly layout: MagnifierLayout;
  readonly zoomSrc: string;
};

type PaneBox = {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
};

const PANE_WIDTH = 380;
const PANE_GAP = 16;

/**
 * Amazon-style gallery: floating hi-res zoom panel to the right of the stage.
 * Does not push PDP layout — panel overlays product details with high z-index.
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
  const [magnifier, setMagnifier] = useState<LensState | null>(null);
  const [paneBox, setPaneBox] = useState<PaneBox | null>(null);
  const [pinchScale, setPinchScale] = useState(1);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const touchStart = useRef<number | null>(null);
  const pinchStart = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fsStageRef = useRef<HTMLDivElement>(null);
  const fsImgRef = useRef<HTMLImageElement>(null);
  const current = all[index] ?? all[0];
  const closeFs = useCallback(() => {
    setFullscreen(false);
    setMagnifier(null);
    setPaneBox(null);
  }, []);
  const fsTrapRef = useFocusTrap(fullscreen, closeFs);

  const zoomSrc =
    current?.type === "image" ? resolveZoomUrl(current.url, current.zoomUrl) : "";

  useEffect(() => {
    setLoaded(false);
    setPinchScale(1);
    setMagnifier(null);
    setPaneBox(null);
    setPan({ x: 50, y: 50 });
  }, [index, current?.url]);

  useEffect(() => {
    const candidates = [all[index + 1], all[index - 1], all[index + 2], all[0], all[1]];
    const urls = new Set<string>();
    for (const item of candidates) {
      if (item?.type === "image") {
        urls.add(item.url);
        urls.add(resolveZoomUrl(item.url, item.zoomUrl));
      }
    }
    if (current?.type === "image") urls.add(zoomSrc);
    for (const url of urls) {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
    }
  }, [index, all, current, zoomSrc]);

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
        closeFs();
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
  }, [fullscreen, go, closeFs]);

  function placeFloatingPane(stageRect: DOMRect): PaneBox {
    const width = Math.min(PANE_WIDTH, Math.max(240, window.innerWidth - stageRect.right - PANE_GAP - 12));
    const height = Math.max(240, stageRect.height);
    let left = stageRect.right + PANE_GAP;
    // If not enough room on the right, float over the details column still to the right of stage.
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - width - 8);
    }
    const top = Math.min(stageRect.top, window.innerHeight - height - 8);
    return { top: Math.max(8, top), left, width, height };
  }

  function updateMagnifier(
    clientX: number,
    clientY: number,
    stageEl: HTMLDivElement | null,
    imgEl: HTMLImageElement | null,
  ) {
    if (!stageEl || !imgEl || !imgEl.naturalWidth || current?.type !== "image") {
      setMagnifier(null);
      setPaneBox(null);
      return;
    }
    if (pinchScale > 1.05) {
      setMagnifier(null);
      setPaneBox(null);
      return;
    }
    const stageRect = stageEl.getBoundingClientRect();
    const box = placeFloatingPane(stageRect);
    const layout = computeMagnifierLayout({
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      naturalWidth: imgEl.naturalWidth,
      naturalHeight: imgEl.naturalHeight,
      pointerX: clientX - stageRect.left,
      pointerY: clientY - stageRect.top,
      paneWidth: box.width,
      paneHeight: box.height,
      zoomFactor: 2.5,
    });
    if (!layout || !layout.overImage) {
      setMagnifier(null);
      setPaneBox(null);
      return;
    }
    setPaneBox(box);
    setMagnifier({ layout, zoomSrc });
  }

  function clearMagnifier() {
    setMagnifier(null);
    setPaneBox(null);
  }

  function touchDistance(
    a: { clientX: number; clientY: number },
    b: { clientX: number; clientY: number },
  ): number {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function renderStage(
    stageR: typeof stageRef,
    imageR: typeof imgRef,
    options?: { readonly fullscreen?: boolean },
  ) {
    const isFs = options?.fullscreen === true;
    return (
      <div
        ref={stageR}
        className={`cx-gallery__stage${magnifier || pinchScale > 1 ? " is-zoom" : ""}${
          isFs ? " cx-gallery__stage--fs" : ""
        }`}
        onMouseLeave={clearMagnifier}
        onMouseMove={(e) => {
          if (current?.type !== "image") return;
          if (pinchScale > 1.05) {
            const rect = e.currentTarget.getBoundingClientRect();
            setPan({
              x: ((e.clientX - rect.left) / rect.width) * 100,
              y: ((e.clientY - rect.top) / rect.height) * 100,
            });
            return;
          }
          updateMagnifier(e.clientX, e.clientY, stageR.current, imageR.current);
        }}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            pinchStart.current = touchDistance(e.touches[0]!, e.touches[1]!);
            touchStart.current = null;
            clearMagnifier();
            return;
          }
          touchStart.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchStart.current) {
            e.preventDefault();
            const dist = touchDistance(e.touches[0]!, e.touches[1]!);
            setPinchScale(Math.min(3, Math.max(1, dist / pinchStart.current)));
            clearMagnifier();
            return;
          }
          if (pinchScale > 1.05 && e.touches[0]) {
            const rect = e.currentTarget.getBoundingClientRect();
            setPan({
              x: ((e.touches[0].clientX - rect.left) / rect.width) * 100,
              y: ((e.touches[0].clientY - rect.top) / rect.height) * 100,
            });
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
        aria-label={`${productName} media. Hover to open high-resolution zoom preview.`}
      >
        {!loaded && !isFs ? <div className="cx-gallery__skeleton" aria-hidden="true" /> : null}
        {current?.type === "video" ? (
          <video
            key={current.id}
            className="cx-gallery__media"
            src={current.url}
            controls
            onLoadedData={() => setLoaded(true)}
          >
            <track kind="captions" />
          </video>
        ) : current ? (
          <img
            key={current.id}
            ref={imageR}
            className="cx-gallery__media"
            src={isFs ? zoomSrc || current.url : current.url}
            alt={current.alt || productName}
            loading={index === 0 || isFs ? "eager" : "lazy"}
            decoding="async"
            width={1600}
            height={1067}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            style={
              pinchScale > 1.05
                ? {
                    transformOrigin: `${pan.x}% ${pan.y}%`,
                    transform: `scale(${pinchScale})`,
                  }
                : undefined
            }
          />
        ) : null}
        {magnifier ? (
          <div
            className="cx-gallery__lens"
            style={{
              left: magnifier.layout.lens.x,
              top: magnifier.layout.lens.y,
              width: magnifier.layout.lens.width,
              height: magnifier.layout.lens.height,
            }}
            aria-hidden="true"
          />
        ) : null}
      </div>
    );
  }

  if (!current) {
    return (
      <div className="cx-gallery cx-gallery--empty" role="status">
        No media available.
      </div>
    );
  }

  const showPane = Boolean(magnifier && paneBox && current.type === "image");

  return (
    <div className="cx-gallery">
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
              <img src={item.url} alt={item.alt || `${productName} thumbnail`} loading="lazy" />
            )}
          </button>
        ))}
      </div>

      <div className="cx-gallery__main">
        {renderStage(stageRef, imgRef)}
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
          <button type="button" className="site-btn site-btn--ghost" onClick={() => setFullscreen(true)}>
            Fullscreen
          </button>
        </div>
        <p className="cx-gallery__hint">
          Hover for Amazon-style zoom panel · Pinch on touch · ← → · F fullscreen
        </p>
      </div>

      {showPane && magnifier && paneBox ? (
        <div
          className="cx-gallery__pane cx-gallery__pane--float is-active"
          aria-hidden="true"
          style={{
            top: paneBox.top,
            left: paneBox.left,
            width: paneBox.width,
            height: paneBox.height,
          }}
        >
          <div className="cx-gallery__pane-clip">
            <img
              className="cx-gallery__pane-img"
              src={magnifier.zoomSrc}
              alt=""
              draggable={false}
              style={{
                width: magnifier.layout.zoomImage.width,
                height: magnifier.layout.zoomImage.height,
                transform: `translate(${-magnifier.layout.zoomOffset.x}px, ${-magnifier.layout.zoomOffset.y}px)`,
              }}
            />
          </div>
        </div>
      ) : null}

      {fullscreen ? (
        <div
          ref={fsTrapRef}
          className="cx-gallery__fs"
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen gallery"
          tabIndex={-1}
          onClick={closeFs}
        >
          <div className="cx-gallery__fs-inner" onClick={(e) => e.stopPropagation()}>
            {current.type === "video" ? (
              <video src={current.url} controls autoPlay className="cx-gallery__fs-media">
                <track kind="captions" />
              </video>
            ) : (
              renderStage(fsStageRef, fsImgRef, { fullscreen: true })
            )}
            <div className="cx-gallery__controls">
              <button type="button" className="site-btn site-btn--ghost" onClick={() => go(-1)}>
                Prev
              </button>
              <button type="button" className="site-btn site-btn--ghost" onClick={() => go(1)}>
                Next
              </button>
              <button type="button" className="site-btn site-btn--primary" onClick={closeFs}>
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
