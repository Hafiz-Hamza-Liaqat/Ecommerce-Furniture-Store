/**
 * RC10.3 — Smart Product Configuration public surface.
 */

export type {
  AlternativeCard,
  CatalogGapRecord,
  CatalogueCollection,
  DesignPreferences,
  ProductRelationshipType,
  RecommendationConfidence,
} from "./types";

export {
  clearCollectionCache,
  collectionIdForName,
  collectionLabel,
  getCollection,
  listCollections,
} from "./collections";

export {
  deriveCompatibleCategories,
  findTemplateRole,
  isProductCompatible,
} from "./compatibility";

export {
  listCompatibleAlternatives,
  type ListCompatibleAlternativesInput,
} from "./alternatives";

export { relatedProducts } from "./relationships";

export {
  buildLineExplanations,
  type BuildLineExplanationsInput,
} from "./explanations";

export {
  STORAGE_KEY as CATALOG_GAPS_STORAGE_KEY,
  clearCatalogGaps,
  listCatalogGaps,
  recordCatalogGap,
  type RecordCatalogGapInput,
} from "./catalog-gaps";

export {
  groupVariants,
  unitPriceForSelection,
  type VariantGroup,
} from "./variants";
