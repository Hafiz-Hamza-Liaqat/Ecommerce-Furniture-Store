/**
 * RC9.4.3 — Canonical brand identity tests.
 */
import { describe, expect, it } from "vitest";
import { BRAND, telUrl, whatsappUrl } from "./index";

describe("RC9.4.3 canonical brand", () => {
  it("exposes official business name and monogram", () => {
    expect(BRAND.name).toBe("Rao Liaqat Furniture");
    expect(BRAND.monogram).toBe("RLF");
  });

  it("exposes canonical contact numbers", () => {
    expect(BRAND.phone).toBe("+92 300 7922450");
    expect(BRAND.phoneSecondary).toBe("+92 313 8897350");
    expect(BRAND.whatsapp).toBe("923007922450");
    expect(BRAND.whatsappDisplay).toBe("+92 300 7922450");
    expect(BRAND.phones).toEqual(["+92 300 7922450", "+92 313 8897350"]);
  });

  it("builds WhatsApp and tel URLs", () => {
    expect(whatsappUrl()).toBe("https://wa.me/923007922450");
    expect(whatsappUrl("Hello")).toContain("text=");
    expect(telUrl()).toBe("tel:+923007922450");
  });

  it("uses production web domain", () => {
    expect(BRAND.web).toBe("https://raoliaquatfurniture.com");
    expect(BRAND.email).toBe("info@raoliaquatfurniture.com");
  });
});
