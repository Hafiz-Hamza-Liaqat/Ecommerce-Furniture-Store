/**
 * Folder & collection foundation — no navigation engine.
 */

export type FolderStatus = "active" | "archived";

export type Folder = {
  readonly id: string;
  readonly companyId: string;
  readonly parentId: string | null;
  readonly name: string;
  readonly path: string;
  readonly status: FolderStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CollectionStatus = "active" | "archived";

export type Collection = {
  readonly id: string;
  readonly companyId: string;
  readonly code: string | null;
  readonly name: string;
  readonly status: CollectionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CollectionEntry = {
  readonly id: string;
  readonly collectionId: string;
  readonly assetId: string;
  readonly sortOrder: number;
};

export type HierarchyReference = {
  readonly nodeId: string;
  readonly parentId: string | null;
  readonly path: string;
};
