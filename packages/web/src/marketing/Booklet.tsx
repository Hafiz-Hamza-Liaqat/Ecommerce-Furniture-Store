import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND, IMG, PRODUCTS } from "./data/content";

const PAGES = [
  {
    title: "Atelier Living",
    body: "Soft modular seating engineered for daily hospitality and home use.",
    image: IMG.catalog1,
    productId: "meridian-sofa",
  },
  {
    title: "Heritage Dining",
    body: "Solid timber tables with quiet geometry and lasting finishes.",
    image: IMG.dining,
    productId: "cascade-table",
  },
  {
    title: "Studio Work",
    body: "Executive and collaborative pieces for considered workplaces.",
    image: IMG.office,
    productId: "northline-desk",
  },
  {
    title: "Material Stories",
    body: "Wood, fabric, and finish systems you can specify with confidence.",
    image: IMG.wood,
    productId: "grove-lounge",
  },
] as const;

const WOODS = ["Oak", "Walnut", "Ash", "Teak"] as const;
const FABRICS = ["Wool blend", "Linen", "Performance weave", "Leather"] as const;
const FINISHES = ["Natural oil", "Matte lacquer", "Smoked", "Whitewash"] as const;
const COLORS = ["Sand", "Forest", "Ink", "Clay"] as const;

export function LuxuryBooklet() {
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [auto, setAuto] = useState(false);
  const [wood, setWood] = useState<(typeof WOODS)[number]>("Oak");
  const [fabric, setFabric] = useState<(typeof FABRICS)[number]>("Wool blend");
  const [finish, setFinish] = useState<(typeof FINISHES)[number]>("Natural oil");
  const [color, setColor] = useState<(typeof COLORS)[number]>("Sand");
  const [fav, setFav] = useState(false);
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const startX = useRef(0);
  const current = PAGES[page] ?? PAGES[0]!;
  const product = PRODUCTS.find((p) => p.id === current.productId);

  const next = useCallback(() => {
    setPage((p) => (p + 1) % PAGES.length);
  }, []);
  const prev = useCallback(() => {
    setPage((p) => (p - 1 + PAGES.length) % PAGES.length);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(next, 4200);
    return () => window.clearInterval(id);
  }, [auto, next]);

  function onPointerDown(clientX: number) {
    setDragging(true);
    startX.current = clientX;
  }
  function onPointerUp(clientX: number) {
    if (!dragging) return;
    setDragging(false);
    const delta = clientX - startX.current;
    if (delta < -60) next();
    if (delta > 60) prev();
  }

  return (
    <section className="booklet" id="booklet" aria-labelledby="booklet-title">
      <div className="booklet__intro">
        <p className="site-eyebrow">Premium booklet</p>
        <h2 id="booklet-title">The {BRAND.name} catalogue experience</h2>
        <p>
          Drag or swipe through the collection. Specify wood, fabric, finish, and color —
          then request a quote or download the PDF.
        </p>
      </div>

      <div className="booklet__stage">
        <div className="booklet__glow" aria-hidden="true" />
        <div className="booklet__particles" aria-hidden="true" />
        {/* role="group" (not "img"): the spread contains focusable hotspot
            buttons, which role="img" would hide from assistive technology. */}
        <div
          className={`booklet__spread${dragging ? " is-dragging" : ""}`}
          role="group"
          aria-label={`Catalogue page ${page + 1} of ${PAGES.length}: ${current.title}`}
          onMouseDown={(e) => onPointerDown(e.clientX)}
          onMouseUp={(e) => onPointerUp(e.clientX)}
          onTouchStart={(e) => onPointerDown(e.touches[0]?.clientX ?? 0)}
          onTouchEnd={(e) => onPointerUp(e.changedTouches[0]?.clientX ?? 0)}
        >
          <article className={`booklet__page booklet__page--left page-${page}`}>
            <img src={current.image} alt={current.title} loading="lazy" />
            <button
              type="button"
              className="booklet__hotspot"
              style={{ top: "28%", left: "62%" }}
              aria-label="Spotlight frame details"
              onClick={() => {
                setSpotlight("Frame joinery · solid hardwood profile");
                setFinish("Matte lacquer");
              }}
            >
              Frame
            </button>
            <button
              type="button"
              className="booklet__hotspot"
              style={{ top: "58%", left: "34%" }}
              aria-label="Spotlight textile details"
              onClick={() => {
                setSpotlight("Textile · performance weave options");
                setFabric("Performance weave");
              }}
            >
              Textile
            </button>
          </article>
          <article className="booklet__page booklet__page--right">
            <p className="booklet__kicker">Plate {String(page + 1).padStart(2, "0")}</p>
            <h3>{current.title}</h3>
            <p>{current.body}</p>
            <div className="booklet__video" aria-label="Material study preview">
              <span>Material study film</span>
              {product ? (
                <Link className="site-btn site-btn--ghost" to={`/products/${product.id}`}>
                  Open product
                </Link>
              ) : null}
            </div>
            {spotlight ? (
              <p className="booklet__spotlight" role="status">
                {spotlight}
              </p>
            ) : null}
            <dl className="booklet__price">
              <dt>From</dt>
              <dd>{product?.priceFrom ?? "On request"}</dd>
            </dl>
            <div className="booklet__selectors">
              <Selector label="Wood" value={wood} options={WOODS} onChange={setWood} />
              <Selector label="Fabric" value={fabric} options={FABRICS} onChange={setFabric} />
              <Selector label="Finish" value={finish} options={FINISHES} onChange={setFinish} />
              <Selector label="Color" value={color} options={COLORS} onChange={setColor} />
            </div>
          </article>
        </div>

        <div className="booklet__controls">
          <button type="button" className="site-btn site-btn--ghost" onClick={prev}>
            Previous
          </button>
          <button type="button" className="site-btn site-btn--ghost" onClick={next}>
            Next
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            aria-pressed={auto}
            onClick={() => setAuto((v) => !v)}
          >
            {auto ? "Pause auto-turn" : "Auto-turn"}
          </button>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            aria-pressed={fav}
            onClick={() => setFav((v) => !v)}
          >
            {fav ? "Favorited" : "Favorite"}
          </button>
          <a className="site-btn site-btn--ghost" href="/catalogue.pdf" download>
            Download PDF
          </a>
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
            }}
          >
            Share
          </button>
          <Link to="/quote" className="site-btn site-btn--primary">
            Design your room
          </Link>
        </div>
      </div>
    </section>
  );
}

function Selector<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  const id = `sel-${label.toLowerCase()}`;
  return (
    <label className="booklet__select" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
