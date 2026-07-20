/**
 * RC9.4.3 — Canonical business identity (single source of truth).
 * Use BRAND.name ("Rao Liaqat Furniture") in headers, metadata, documents.
 * Use BRAND.monogram ("RLF") only for compact UI (mobile logo, collapsed sidebar, icons).
 */

export const BRAND = {
  /** Full legal / marketing business name */
  name: "Rao Liaqat Furniture",
  /** Responsive monogram — mobile navbar, favicon, collapsed sidebar */
  monogram: "RLF",
  /** @deprecated Use monogram — kept for gradual migration */
  short: "RLF",
  tagline: "Furniture crafted for lasting spaces.",
  email: "info@raoliaquatfurniture.com",
  phones: ["+92 300 7922450", "+92 313 8897350"] as const,
  /** Primary line — use for single-line display */
  phone: "+92 300 7922450",
  phoneSecondary: "+92 313 8897350",
  /** WhatsApp wa.me digits only (no +) */
  whatsapp: "923007922450",
  whatsappDisplay: "+92 300 7922450",
  /** Showroom — map embed added at production launch */
  showroomNotice: "Showroom location will be added before production launch.",
  address: "Pakistan",
  social: {
    linkedin: "" as string,
    instagram: "" as string,
    facebook: "" as string,
  },
  web: "https://raoliaquatfurniture.com",
} as const;

export function whatsappUrl(text?: string): string {
  const base = `https://wa.me/${BRAND.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function telUrl(phone: string = BRAND.phone): string {
  return `tel:${phone.replace(/\s/g, "")}`;
}

export type BrandContact = typeof BRAND;
