import { useState } from "react";
import { Link } from "react-router-dom";
import { Seo } from "../Seo";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { getCatalogueProduct } from "../data/catalogue";
import {
  enqueueLead,
  getCompareIds,
  getWishlistIds,
  moveWishlistToCompare,
  removeWishlist,
  subscribeCxStorage,
} from "../cx/stores";
import { useSession } from "../../state/session";
import { useReveal } from "../useReveal";
import { useEffect } from "react";

export function WishlistPage() {
  const { tokens } = useSession();
  const [ids, setIds] = useState(getWishlistIds);
  const [compareIds, setCompareIds] = useState(getCompareIds);
  const [msg, setMsg] = useState("");
  useReveal([ids.length]);

  useEffect(() => {
    return subscribeCxStorage((key) => {
      if (key === "afh.cx.wishlist") setIds(getWishlistIds());
      if (key === "afh.cx.compare") setCompareIds(getCompareIds());
    });
  }, []);

  return (
    <>
      <Seo title="Wishlist" description="Saved furniture pieces." path="/wishlist" />
      <header className="site-page-hero">
        <Breadcrumbs items={[{ label: "Wishlist" }]} />
        <h1>Wishlist</h1>
        <p>Saved in this browser. Sign-in keeps your local list; cloud sync is planned later.</p>
        <div className="site-hero__actions">
          {!tokens?.sessionId ? (
            <Link to="/login" className="site-btn site-btn--ghost">
              Sign in
            </Link>
          ) : null}
          <button
            type="button"
            className="site-btn site-btn--ghost"
            onClick={() => {
              const url = `${window.location.origin}/wishlist`;
              void navigator.clipboard?.writeText(url);
            }}
          >
            Share wishlist link
          </button>
          <Link to="/compare" className="site-btn site-btn--ghost">
            Open compare ({compareIds.length}/4)
          </Link>
          <button
            type="button"
            className="site-btn site-btn--primary"
            onClick={() => {
              enqueueLead({
                intent: "Wishlist quotation",
                name: "Wishlist visitor",
                email: "visitor@example.com",
                message: `Please quote wishlist: ${ids.join(", ")}`,
                source: "wishlist",
                meta: { productIds: ids },
              });
              window.alert("Quotation inquiry queued from wishlist.");
            }}
            disabled={ids.length === 0}
          >
            Move to quotation
          </button>
        </div>
        {msg ? (
          <p className="site-form-success" role="status">
            {msg}
          </p>
        ) : null}
      </header>
      {ids.length === 0 ? (
        <div className="site-section cx-empty" role="status">
          <h2>Your wishlist is empty</h2>
          <Link to="/furniture" className="site-btn site-btn--primary">
            Browse furniture
          </Link>
        </div>
      ) : (
        <div className="site-section site-reveal">
          <div className="site-product-grid cx-stagger">
          {ids.map((id) => {
            const p = getCatalogueProduct(id);
            if (!p) return null;
            const inCompare = compareIds.includes(id);
            return (
              <article key={id} className="site-product">
                <Link to={`/products/${p.id}`}>
                  <img src={p.image} alt={p.name} loading="lazy" />
                  <div>
                    <h2>{p.name}</h2>
                    <p className="site-product__price">{p.priceFrom}</p>
                  </div>
                </Link>
                <div className="cx-card-actions">
                  <button
                    type="button"
                    className="site-btn site-btn--ghost"
                    disabled={!inCompare && compareIds.length >= 4}
                    onClick={() => {
                      const next = moveWishlistToCompare(id);
                      setIds(next.wishlist);
                      setCompareIds(next.compare);
                      setMsg(
                        next.compare.includes(id)
                          ? `${p.name} added to compare.`
                          : "Compare is full (max 4).",
                      );
                    }}
                  >
                    {inCompare ? "In compare" : "Move to Compare"}
                  </button>
                  <button
                    type="button"
                    className="site-btn site-btn--ghost"
                    onClick={() => setIds(removeWishlist(id))}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
          </div>
        </div>
      )}
    </>
  );
}
