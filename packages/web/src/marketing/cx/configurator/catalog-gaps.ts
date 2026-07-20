/**
 * RC10.3 — Internal catalog-gap recording (ops side-channel; not customer UI).
 */

import type { CatalogGapRecord } from "./types";

export const STORAGE_KEY = "afh.cx.catalogGaps";

function readGaps(): CatalogGapRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (row): row is CatalogGapRecord =>
        !!row &&
        typeof row === "object" &&
        typeof (row as CatalogGapRecord).id === "string" &&
        typeof (row as CatalogGapRecord).role === "string",
    );
  } catch {
    return [];
  }
}

function writeGaps(rows: readonly CatalogGapRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch {
    /* quota / private mode */
  }
}

export type RecordCatalogGapInput = {
  readonly role: string;
  readonly templateId?: string;
  readonly requiredQty: number;
  readonly availableCount: number;
};

export function recordCatalogGap(input: RecordCatalogGapInput): CatalogGapRecord {
  const requiredQty = Math.max(0, Math.round(input.requiredQty));
  const availableCount = Math.max(0, Math.round(input.availableCount));
  const gap = Math.max(0, requiredQty - availableCount);
  const recordedAt = new Date().toISOString();
  const id = `gap-${recordedAt}-${input.role}`.replace(/\s+/g, "-").toLowerCase();

  const record: CatalogGapRecord = {
    id,
    role: input.role,
    requiredQty,
    availableCount,
    gap,
    recordedAt,
    ...(input.templateId ? { templateId: input.templateId } : {}),
  };

  const next = [...readGaps(), record].slice(-200);
  writeGaps(next);
  return record;
}

export function listCatalogGaps(): readonly CatalogGapRecord[] {
  return readGaps();
}

export function clearCatalogGaps(): void {
  writeGaps([]);
}
