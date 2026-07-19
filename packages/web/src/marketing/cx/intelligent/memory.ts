/**
 * RC9.2 — Session memory persistence for the furniture consultant.
 */

import type { ConsultantMemory } from "./types";

const MEMORY_KEY = "afh.cx.consultant.memory";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadConsultantMemory(): ConsultantMemory {
  return readJson<ConsultantMemory>(MEMORY_KEY, {});
}

export function saveConsultantMemory(memory: ConsultantMemory): void {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
}

export function clearConsultantMemory(): void {
  localStorage.removeItem(MEMORY_KEY);
}

export function rememberSelected(memory: ConsultantMemory, productId: string): ConsultantMemory {
  const selected = [...new Set([...(memory.selectedProductIds ?? []), productId])];
  const rejected = (memory.rejectedProductIds ?? []).filter((id) => id !== productId);
  return { ...memory, selectedProductIds: selected, rejectedProductIds: rejected };
}

export function rememberRejected(memory: ConsultantMemory, productId: string): ConsultantMemory {
  const rejected = [...new Set([...(memory.rejectedProductIds ?? []), productId])];
  const selected = (memory.selectedProductIds ?? []).filter((id) => id !== productId);
  return { ...memory, selectedProductIds: selected, rejectedProductIds: rejected };
}
