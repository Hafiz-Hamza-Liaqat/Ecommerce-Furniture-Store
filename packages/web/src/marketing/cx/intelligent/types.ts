/**
 * RC9.2 — Intelligent Furniture Consultant types.
 * Structured session memory + rich assistant payloads (catalog-grounded).
 */

import type { EndUse, FurniturePackage, PlannerStyle } from "../budget-planner";
import type { CatalogueProduct } from "../../data/catalogue";

export type ConsultantStyle =
  | PlannerStyle
  | "scandinavian"
  | "luxury"
  | "minimal"
  | "industrial"
  | "contemporary";

export type ConsultantMemory = {
  readonly roomType?: string;
  readonly endUse?: EndUse;
  readonly industry?: string;
  /** RC9.3 space template (office, jahez, cafe, …). */
  readonly spaceTemplateId?: string;
  readonly widthM?: number;
  readonly depthM?: number;
  readonly seats?: number;
  readonly employeeCount?: number;
  readonly managers?: number;
  readonly executiveCabins?: number;
  readonly bedrooms?: number;
  readonly style?: ConsultantStyle;
  readonly colours?: readonly string[];
  readonly materials?: readonly string[];
  readonly budgetPkr?: number;
  readonly preference?: string;
  readonly selectedProductIds?: readonly string[];
  readonly rejectedProductIds?: readonly string[];
  readonly lastQuery?: string;
  readonly readyForQuote?: boolean;
  /** Free-form space flags from discovery (reception, conference, …). */
  readonly spaceFlags?: Readonly<Record<string, boolean>>;
};

/** Back-compat alias used by the page shell. */
export type ConsultantState = ConsultantMemory;

export type ProductRecommendation = {
  readonly product: CatalogueProduct;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly alternatives: readonly {
    readonly product: CatalogueProduct;
    readonly tradeoff: string;
  }[];
};

export type ConsultantAction = {
  readonly id: string;
  readonly label: string;
  readonly kind: "link" | "chip" | "lead" | "quote" | "whatsapp" | "planner";
  readonly href?: string;
  readonly value?: string;
};

export type ConsultantCard =
  | {
      readonly type: "product";
      readonly productId: string;
      readonly name: string;
      readonly priceFrom: string;
      readonly image: string;
      readonly href: string;
      readonly reasons: readonly string[];
      readonly alternatives: readonly {
        readonly productId: string;
        readonly name: string;
        readonly priceFrom: string;
        readonly href: string;
        readonly tradeoff: string;
      }[];
    }
  | {
      readonly type: "package";
      readonly packageId: string;
      readonly name: string;
      readonly tier: FurniturePackage["tier"];
      readonly totalPkr: number;
      readonly totalLabel: string;
      readonly budgetPkr?: number;
      readonly budgetLabel?: string;
      readonly utilizationPercent?: number;
      readonly remainingLabel?: string;
      readonly lines: readonly {
        readonly productId: string;
        readonly name: string;
        readonly role: string;
        readonly qty: number;
        readonly lineTotalLabel: string;
        readonly href: string;
      }[];
      readonly upgrades?: readonly string[];
      readonly savingsTips?: readonly string[];
    }
  | {
      readonly type: "quote";
      readonly title: string;
      readonly lines: readonly {
        readonly productId: string;
        readonly name: string;
        readonly qty: number;
        readonly unitLabel: string;
        readonly lineTotalLabel: string;
      }[];
      readonly subtotalLabel: string;
      readonly notes: readonly string[];
      readonly quoteHref: string;
    }
  | {
      readonly type: "actions";
      readonly actions: readonly ConsultantAction[];
    };

export type ConsultantTurnResult = {
  readonly state: ConsultantMemory;
  readonly replies: readonly {
    readonly role: "assistant" | "user";
    readonly text: string;
    readonly at: string;
    readonly cards?: readonly ConsultantCard[];
  }[];
  readonly done: boolean;
  readonly typingMs?: number;
};

export type ConsultantProviderId =
  | "local-grounded"
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure-openai";

export type ConsultantChatRequest = {
  readonly memory: ConsultantMemory;
  readonly userText: string;
  readonly history: readonly { role: "user" | "assistant"; text: string }[];
  readonly signal?: AbortSignal;
};

export type ConsultantProvider = {
  readonly id: ConsultantProviderId;
  readonly label: string;
  /** Architecture-ready streaming; local provider yields one final chunk. */
  chat(req: ConsultantChatRequest): AsyncIterable<{
    readonly delta?: string;
    readonly turn?: ConsultantTurnResult;
    readonly done?: boolean;
  }>;
};
