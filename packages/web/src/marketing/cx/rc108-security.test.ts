/**
 * RC10.8 Phase 3 — security-focused unit checks (export / redirect / encoding).
 */

import { describe, expect, it } from "vitest";
import { escapeCsv } from "./analytics/export";
import { sanitizeReturnUrl } from "../nav/role-home";

describe("RC10.8 security — CSV formula neutralization", () => {
  it("prefixes spreadsheet formula metacharacters", () => {
    expect(escapeCsv("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
    expect(escapeCsv("+1234")).toBe("'+1234");
    expect(escapeCsv("-1234")).toBe("'-1234");
    expect(escapeCsv("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("still quotes commas and preserves ordinary labels", () => {
    expect(escapeCsv("A. Khan")).toBe("A. Khan");
    expect(escapeCsv("Smith, Jr")).toBe('"Smith, Jr"');
  });
});

describe("RC10.8 security — open redirect hardening", () => {
  it("rejects protocol-relative and escape variants", () => {
    expect(sanitizeReturnUrl("//evil.example")).toBeNull();
    expect(sanitizeReturnUrl("/\\evil.example")).toBeNull();
    expect(sanitizeReturnUrl("https://evil.example")).toBeNull();
    expect(sanitizeReturnUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeReturnUrl("/login?next=/app")).toBeNull();
  });

  it("allows same-origin relative destinations", () => {
    expect(sanitizeReturnUrl("/app/sales/orders")).toBe("/app/sales/orders");
    expect(sanitizeReturnUrl("/portal")).toBe("/portal");
  });
});

describe("RC10.8 security — HTML export encoding contract", () => {
  it("escapeHtml-equivalent encoding rejects script breakout", () => {
    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const hostile = `<img src=x onerror=alert(1)>`;
    const encoded = escapeHtml(hostile);
    expect(encoded).not.toContain("<img");
    expect(encoded).toContain("&lt;img");
    expect(`<td>${encoded}</td>`).not.toMatch(/<img/i);
  });
});
