import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusTrap } from "../../a11y/useFocusTrap";
import {
  hasModelAssets,
  normalizeSpinSequence,
  useImageSequenceEngine,
  type ProductModelAssets,
  type SpinSequence,
} from "../media";

type Props = {
  readonly frames?: readonly string[];
  readonly sequence?: SpinSequence | null;
  readonly models?: ProductModelAssets;
  readonly productName: string;
};

/**
 * 360° image-sequence viewer — configurable frame count, multi-row ready,
 * auto-spin of the current product only. GLB/USDZ are capability hooks only.
 */
export function ProductSpinViewer({
  frames,
  sequence,
  models,
  productName,
}: Props) {
  const resolved = useMemo(
    () => normalizeSpinSequence(sequence) ?? normalizeSpinSequence(frames),
    [sequence, frames],
  );
  const engine = useImageSequenceEngine(resolved);
  const [fullscreen, setFullscreen] = useState(false);
  const closeFs = useCallback(() => setFullscreen(false), []);
  const fsTrapRef = useFocusTrap(fullscreen, closeFs);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const modelHint = hasModelAssets(models ?? {})
    ? "3D model assets detected (GLB/GLTF/USDZ) — renderer reserved for a future release."
    : null;

  if (!resolved || engine.frameCount === 0) {
    return (
      <p className="cx-spin__empty" role="status">
        360° frames are not available for this product yet.
        {modelHint ? ` ${modelHint}` : ""}
      </p>
    );
  }

  const stage = (
    <div
      className="cx-spin__stage"
      role="img"
      aria-label={`${productName} 360 degree view, frame ${engine.frameIndex + 1} of ${engine.frameCount}${
        engine.rowCount > 1 ? `, elevation ${engine.rowIndex + 1} of ${engine.rowCount}` : ""
      }`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          engine.pauseInteraction();
          engine.stepFrame(1);
        }
        if (e.key === "ArrowLeft") {
          engine.pauseInteraction();
          engine.stepFrame(-1);
        }
        if (e.key === "ArrowDown" && engine.rowCount > 1) {
          engine.pauseInteraction();
          engine.stepRow(1);
        }
        if (e.key === "ArrowUp" && engine.rowCount > 1) {
          engine.pauseInteraction();
          engine.stepRow(-1);
        }
        if (e.key === "Home" || e.key === "0") engine.reset();
        if (e.key === "Escape" && fullscreen) setFullscreen(false);
        if (e.key.toLowerCase() === "a") engine.toggleAutoSpin();
      }}
      onMouseDown={(e) => engine.beginDrag(e.clientX, e.clientY)}
      onMouseMove={(e) => engine.moveDrag(e.clientX, e.clientY)}
      onMouseUp={() => engine.endDrag()}
      onMouseLeave={() => engine.endDrag()}
      onTouchStart={(e) => {
        const t = e.touches[0];
        if (t) engine.beginDrag(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (t) engine.moveDrag(t.clientX, t.clientY);
      }}
      onTouchEnd={() => engine.endDrag()}
    >
      {!engine.ready ? (
        <div className="cx-spin__spinner" role="status" aria-live="polite">
          <span className="cx-spin__spinner-ring" aria-hidden="true" />
          <span>Loading 360°</span>
        </div>
      ) : null}
      {engine.currentUrl ? (
        <img
          src={engine.currentUrl}
          alt=""
          draggable={false}
          className={`cx-spin__img${engine.ready ? " is-ready" : ""}`}
        />
      ) : null}
      <p className="cx-spin__hint">
        Drag to rotate · Auto-spin this product · Esc exits fullscreen
        {engine.rowCount > 1 ? " · ↑↓ elevation" : ""}
      </p>
      <span className="cx-spin__meta" aria-live="polite">
        Frame {engine.frameIndex + 1}/{engine.frameCount}
        {engine.rowCount > 1 ? ` · Row ${engine.rowIndex + 1}/${engine.rowCount}` : ""}
      </span>
    </div>
  );

  return (
    <div
      className="cx-spin"
      data-viewer="spin-sequence"
      data-frame-count={engine.frameCount}
      data-row-count={engine.rowCount}
      data-future-glb={models?.glb ? "available" : "ready"}
      data-future-usdz={models?.usdz ? "available" : "ready"}
      data-future-gltf={models?.gltf ? "available" : "ready"}
    >
      <div className="cx-spin__toolbar">
        <button
          type="button"
          className="site-btn site-btn--ghost"
          aria-pressed={engine.autoSpin}
          disabled={engine.reducedMotion}
          title={
            engine.reducedMotion
              ? "Auto-spin disabled by reduced-motion preference"
              : "Rotate this product’s frame sequence"
          }
          onClick={() => engine.toggleAutoSpin()}
        >
          {engine.autoSpin ? "Pause auto-spin" : "Auto-spin"}
        </button>
        <button type="button" className="site-btn site-btn--ghost" onClick={() => engine.reset()}>
          Reset
        </button>
        <button
          type="button"
          className="site-btn site-btn--ghost"
          onClick={() => setFullscreen(true)}
        >
          Fullscreen
        </button>
      </div>
      {modelHint ? (
        <p className="cx-spin__model-hint" role="note">
          {modelHint}
        </p>
      ) : null}
      {stage}
      {fullscreen ? (
        <div
          ref={fsTrapRef}
          className="cx-gallery__fs"
          role="dialog"
          aria-modal="true"
          aria-label="360 fullscreen"
          tabIndex={-1}
          onClick={() => setFullscreen(false)}
        >
          <div className="cx-gallery__fs-inner" onClick={(e) => e.stopPropagation()}>
            {stage}
            <button
              type="button"
              className="site-btn site-btn--primary"
              onClick={() => setFullscreen(false)}
            >
              Close (Esc)
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
