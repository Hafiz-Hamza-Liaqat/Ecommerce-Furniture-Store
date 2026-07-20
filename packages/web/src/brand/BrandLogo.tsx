import { Link, type LinkProps } from "react-router-dom";
import { BRAND } from "./index";

export type BrandLogoProps = {
  readonly className?: string;
  readonly to?: string;
  /** full = mark + name · monogram = SVG mark only · text = RLF letters only · responsive = name ≥768 / mark <768 */
  readonly variant?: "full" | "monogram" | "text" | "responsive";
  readonly asLink?: boolean;
} & Omit<LinkProps, "to">;

/**
 * Premium text logo — SVG monogram + responsive wordmark.
 * Desktop ≥1200px: mark + full name · Tablet 768–1199: mark + full name · Mobile <768: mark only
 */
export function BrandLogo({
  className = "",
  to = "/",
  variant = "responsive",
  asLink = true,
  ...rest
}: BrandLogoProps) {
  const content = (
    <span className={`brand-logo brand-logo--${variant}`}>
      {variant !== "text" ? <BrandMonogramSvg className="brand-logo__svg" /> : null}
      {variant === "full" || variant === "responsive" ? (
        <span className="brand-logo__wordmark">
          <span className="brand-logo__name">{BRAND.name}</span>
        </span>
      ) : null}
      {variant === "text" ? (
        <span className="brand-logo__mono-text">{BRAND.monogram}</span>
      ) : null}
    </span>
  );

  if (!asLink) {
    return className ? <span className={className}>{content}</span> : content;
  }

  return (
    <Link
      to={to}
      className={`brand-logo__link${className ? ` ${className}` : ""}`}
      aria-label={`${BRAND.name} home`}
      {...rest}
    >
      {content}
    </Link>
  );
}

export function BrandMonogramSvg({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      width="40"
      height="40"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="10" className="brand-logo__svg-bg" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        className="brand-logo__svg-text"
        fontFamily="Syne, Manrope, sans-serif"
        fontSize="13"
        fontWeight="700"
        letterSpacing="0.04em"
      >
        RLF
      </text>
    </svg>
  );
}

/** Compact mark for workspace sidebar (collapsed = monogram only). */
export function BrandMark({
  collapsed,
  className = "",
}: {
  readonly collapsed?: boolean;
  readonly className?: string;
}) {
  return (
    <div className={`brand-mark${collapsed ? " brand-mark--collapsed" : ""}${className ? ` ${className}` : ""}`}>
      <BrandMonogramSvg className="brand-mark__svg" />
      {!collapsed ? (
        <div className="brand-mark__text">
          <span className="brand-mark__name">{BRAND.name}</span>
          <span className="brand-mark__sub">Enterprise workspace</span>
        </div>
      ) : null}
    </div>
  );
}
