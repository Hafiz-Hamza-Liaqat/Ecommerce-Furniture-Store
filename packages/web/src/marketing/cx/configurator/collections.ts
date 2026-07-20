/**
 * RC10.3 — First-class catalogue collection entities (from string field).
 */

import { CATALOGUE } from "../../data/catalogue";
import type { CatalogueCollection } from "./types";

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let cache: readonly CatalogueCollection[] | null = null;

/** Unique collections from CATALOGUE, stable id = slug of display name. */
export function listCollections(): readonly CatalogueCollection[] {
  if (cache) return cache;
  const byId = new Map<string, CatalogueCollection>();
  for (const p of CATALOGUE) {
    const name = p.collection.trim();
    if (!name) continue;
    const id = slugify(name);
    if (!id || byId.has(id)) continue;
    byId.set(id, { id, name });
  }
  cache = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

export function getCollection(id: string): CatalogueCollection | undefined {
  return listCollections().find((c) => c.id === id);
}

export function collectionIdForName(name: string): string {
  return slugify(name);
}

export function collectionLabel(idOrName: string): string {
  const byId = getCollection(idOrName);
  if (byId) return byId.name;
  const byName = listCollections().find(
    (c) => c.name.toLowerCase() === idOrName.trim().toLowerCase(),
  );
  return byName?.name ?? idOrName.trim();
}

/** Invalidate after hot catalogue reloads (tests). */
export function clearCollectionCache(): void {
  cache = null;
}
