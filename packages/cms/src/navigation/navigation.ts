/**
 * Navigation models — no rendering.
 */

export type MenuStatus = "draft" | "active" | "archived";

export type Menu = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly status: MenuStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type MenuItem = {
  readonly id: string;
  readonly menuId: string;
  readonly companyId: string | null;
  readonly parentItemId: string | null;
  readonly label: string;
  readonly contentId: string | null;
  readonly externalUrl: string | null;
  readonly sortOrder: number;
};

export type NavigationGroup = {
  readonly id: string;
  readonly companyId: string | null;
  readonly code: string;
  readonly name: string;
  readonly menuId: string | null;
};

export type FooterLink = {
  readonly id: string;
  readonly companyId: string | null;
  readonly label: string;
  readonly contentId: string | null;
  readonly externalUrl: string | null;
  readonly sortOrder: number;
};

export type BreadcrumbReference = {
  readonly contentId: string;
  readonly label: string;
  readonly slug: string | null;
};
