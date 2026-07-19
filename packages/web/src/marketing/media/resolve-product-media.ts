import type { CatalogueProduct, ProductMedia } from "../data/catalogue";
import { resolveZoomUrl } from "./magnifier";
import { normalizeSpinSequence } from "./useImageSequenceEngine";
import type {
  GalleryMediaItem,
  ProductMediaCollection,
  ProductModelAssets,
  SpinSequence,
} from "./types";

function toGalleryItem(m: ProductMedia): GalleryMediaItem | null {
  if (m.type === "pdf") return null;
  if (m.type === "video") {
    return { id: m.id, type: "video", url: m.url, alt: m.alt };
  }
  return {
    id: m.id,
    type: "image",
    url: m.url,
    alt: m.alt,
    zoomUrl: resolveZoomUrl(m.url, m.zoomUrl),
  };
}

/**
 * Resolve asset-driven media for a product (+ optional variant media filter).
 * No code changes required when production assets replace demo URLs.
 */
export function resolveProductMedia(
  product: CatalogueProduct,
  options?: {
    readonly variantMediaIds?: readonly string[] | null;
  },
): ProductMediaCollection {
  const ids = options?.variantMediaIds;
  const media = product.media.filter((m) => {
    if (m.type === "video" || m.type === "pdf") return true;
    if (!ids || ids.length === 0) return true;
    return ids.includes(m.id);
  });

  const gallery = media
    .map(toGalleryItem)
    .filter((x): x is GalleryMediaItem => x != null);

  const spin: SpinSequence | null =
    normalizeSpinSequence(product.spinSequence) ??
    normalizeSpinSequence(product.spinFrames);

  const models: ProductModelAssets = {
    ...(product.models?.glb ? { glb: product.models.glb } : {}),
    ...(product.models?.gltf ? { gltf: product.models.gltf } : {}),
    ...(product.models?.usdz ? { usdz: product.models.usdz } : {}),
  };

  return { gallery, spin, models };
}
