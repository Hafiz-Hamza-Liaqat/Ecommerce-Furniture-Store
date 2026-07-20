/**
 * RC10.3 — Change-product drawer (compatible alternatives grid).
 */
import { useEffect, useId, useMemo } from "react";
import { formatPkr, type CatalogueProduct } from "../../../data/catalogue";
import type { TemplateRole } from "../../intelligent/templates";
import { listCompatibleAlternatives } from "../alternatives";
import type { DesignPreferences } from "../types";

function deltaLabel(delta: number): string {
  if (delta === 0) return "Same price";
  const abs = formatPkr(Math.abs(delta));
  return delta > 0 ? `(+${abs.replace(/^PKR\s*/, "")})` : `(-${abs.replace(/^PKR\s*/, "")})`;
}

export type ChangeProductDrawerProps = {
  readonly open: boolean;
  readonly role: TemplateRole;
  readonly currentProduct: CatalogueProduct;
  readonly qty: number;
  readonly prefs?: DesignPreferences;
  readonly onClose: () => void;
  readonly onSelect: (product: CatalogueProduct) => void;
  readonly onToggleWishlist: (productId: string) => void;
  readonly onToggleCompare: (productId: string) => void;
  readonly wishlistIds: readonly string[];
  readonly compareIds: readonly string[];
  readonly onRequestCustom?: () => void;
  readonly onRequestConsult?: () => void;
};

export function ChangeProductDrawer({
  open,
  role,
  currentProduct,
  qty,
  prefs,
  onClose,
  onSelect,
  onToggleWishlist,
  onToggleCompare,
  wishlistIds,
  compareIds,
  onRequestCustom,
  onRequestConsult,
}: ChangeProductDrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const cards = useMemo(() => {
    if (!open) return [];
    return listCompatibleAlternatives({
      role,
      currentProductId: currentProduct.id,
      ...(prefs ? { prefs } : {}),
      limit: 24,
    });
  }, [open, role, currentProduct.id, prefs]);

  if (!open) return null;

  const wish = new Set(wishlistIds);
  const compare = new Set(compareIds);

  return (
    <div className="cx-change-product-drawer" role="presentation">
      <button
        type="button"
        className="cx-change-product-drawer__backdrop"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <div
        className="cx-change-product-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="cx-change-product-drawer__head">
          <div>
            <h2 id={titleId}>Change product</h2>
            <p className="cx-muted">
              Compatible alternatives for <strong>{role.role}</strong>
              {qty > 1 ? ` · qty ${qty}` : ""}. Current: {currentProduct.name}.
            </p>
          </div>
          <button type="button" className="site-btn site-btn--ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {cards.length === 0 ? (
          <div className="cx-change-product-drawer__empty">
            <p>No compatible catalogue products for this role.</p>
            <p className="cx-muted">We can manufacture this. Estimated lead time: 14–21 days.</p>
            <div className="cx-change-product-drawer__empty-actions">
              <button
                type="button"
                className="site-btn site-btn--primary"
                onClick={() => onRequestCustom?.()}
              >
                Request Custom Manufacturing
              </button>
              <button
                type="button"
                className="site-btn site-btn--outline"
                onClick={() => onRequestConsult?.()}
              >
                Request Sales Consultation
              </button>
            </div>
          </div>
        ) : (
          <ul className="cx-change-product-drawer__grid">
            {cards.map((card) => {
              const p = card.product;
              const saved = wish.has(p.id);
              const inCompare = compare.has(p.id);
              return (
                <li key={p.id} className="cx-change-product-drawer__card">
                  <img src={p.image} alt="" className="cx-change-product-drawer__img" />
                  <div className="cx-change-product-drawer__body">
                    <h3>{p.name}</h3>
                    <p className="cx-muted">
                      {[p.collection, p.material, p.color].filter(Boolean).join(" · ")}
                    </p>
                    <p className="cx-muted">
                      {p.rating != null ? `★ ${p.rating.toFixed(1)}` : "Unrated"}
                      {p.availability ? ` · ${p.availability}` : ""}
                      {p.leadTime ? ` · ${p.leadTime}` : ""}
                    </p>
                    <p>
                      <strong>{formatPkr(p.pricePkr)}</strong>{" "}
                      <span className="cx-muted">{deltaLabel(card.priceDeltaPkr)}</span>
                    </p>
                    <div className="cx-change-product-drawer__actions">
                      <button
                        type="button"
                        className="site-btn site-btn--primary"
                        onClick={() => onSelect(p)}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="site-btn site-btn--ghost"
                        aria-pressed={saved}
                        onClick={() => onToggleWishlist(p.id)}
                      >
                        {saved ? "Saved" : "Save"}
                      </button>
                      <button
                        type="button"
                        className="site-btn site-btn--ghost"
                        aria-pressed={inCompare}
                        onClick={() => onToggleCompare(p.id)}
                      >
                        {inCompare ? "In compare" : "Compare"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
