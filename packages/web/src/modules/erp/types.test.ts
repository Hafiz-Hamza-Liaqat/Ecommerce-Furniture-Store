import { describe, expect, it } from "vitest";
import {
  canEditPresentedField,
  canPresentField,
  type FormField,
} from "./types";

const sensitiveField: FormField = {
  name: "unitMajor",
  label: "Unit amount",
  type: "number",
  permissionView: "finance.costs.read",
  permissionEdit: "finance.costs.read",
  sensitivity: "financial",
};

describe("RC5.6 field presentation metadata", () => {
  it("hides a protected field while permissions are unresolved or denied", () => {
    expect(canPresentField(sensitiveField, null)).toBe(false);
    expect(canPresentField(sensitiveField, ["finance.invoices.read"])).toBe(
      false,
    );
  });

  it("shows a protected field only when its view permission is present", () => {
    expect(
      canPresentField(sensitiveField, ["finance.costs.read"]),
    ).toBe(true);
  });

  it("keeps view-only fields disabled without the edit permission", () => {
    const readOnly: FormField = {
      ...sensitiveField,
      permissionView: "finance.costs.read",
      permissionEdit: "finance.credit_accounts.update",
    };
    expect(canPresentField(readOnly, ["finance.costs.read"])).toBe(true);
    expect(canEditPresentedField(readOnly, ["finance.costs.read"])).toBe(
      false,
    );
  });

  it("leaves unclassified fields visible and editable", () => {
    const ordinary: FormField = {
      name: "number",
      label: "Invoice number",
      type: "text",
    };
    expect(canPresentField(ordinary, null)).toBe(true);
    expect(canEditPresentedField(ordinary, null)).toBe(true);
  });
});
