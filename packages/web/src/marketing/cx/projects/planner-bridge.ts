/**
 * RC9.4 — Restore planner UI state from a saved project room (no engine changes).
 */

import { getCatalogueProduct } from "../../data/catalogue";
import type { SpaceBrief, SpaceTemplateId } from "../intelligent/space-brief";
import type { ProjectRoom } from "./types";

export type RestoredPlannerState = {
  templateId: SpaceTemplateId;
  brief: SpaceBrief;
  activeTier: "economy" | "recommended" | "premium";
  lines: {
    product: NonNullable<ReturnType<typeof getCatalogueProduct>>;
    qty: number;
    role: string;
    zone?: string;
  }[];
};

export function restorePlannerFromRoom(room: ProjectRoom): RestoredPlannerState | null {
  const lines = room.lines
    .map((l) => {
      const product = getCatalogueProduct(l.productId);
      if (!product) return null;
      return {
        product,
        qty: l.qty,
        role: l.role,
        ...(l.zone ? { zone: l.zone } : {}),
      };
    })
    .filter((l): l is NonNullable<typeof l> => l != null);

  return {
    templateId: room.templateId,
    brief: { ...room.brief, flags: { ...room.brief.flags } },
    activeTier: room.activeTier,
    lines,
  };
}
