/**
 * RC10.6 — Interactive filter bar for CX BI dashboards.
 */

import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  PIPELINE_STAGES,
  PIPELINE_STAGE_LABELS,
} from "../../sales/types";
import type { BiFilters } from "../types";

export function BiFilterBar({
  value,
  onChange,
  salespeople,
  projects,
  styles,
  roomTypes,
}: {
  readonly value: BiFilters;
  readonly onChange: (next: BiFilters) => void;
  readonly salespeople: readonly string[];
  readonly projects: readonly { id: string; title: string }[];
  readonly styles: readonly string[];
  readonly roomTypes: readonly string[];
}) {
  function set<K extends keyof BiFilters>(key: K, v: BiFilters[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="bi-filters cx-bi-filters" aria-label="Analytics filters">
      <div className="bi-filters__row">
        <label>
          <span>Date range</span>
          <select
            value={value.relative}
            onChange={(e) => set("relative", e.target.value as BiFilters["relative"])}
          >
            <option value="all">All time</option>
            <option value="mtd">Month to date</option>
            <option value="qtd">Quarter to date</option>
            <option value="ytd">Year to date</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        {value.relative === "custom" ? (
          <>
            <label>
              <span>From</span>
              <input
                type="date"
                value={value.dateFrom}
                onChange={(e) => set("dateFrom", e.target.value)}
              />
            </label>
            <label>
              <span>To</span>
              <input
                type="date"
                value={value.dateTo}
                onChange={(e) => set("dateTo", e.target.value)}
              />
            </label>
          </>
        ) : null}
        <label>
          <span>Salesperson</span>
          <select value={value.salesperson} onChange={(e) => set("salesperson", e.target.value)}>
            <option value="all">All</option>
            {salespeople.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Project</span>
          <select value={value.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="all">All</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Customer</span>
          <input
            value={value.customer}
            onChange={(e) => set("customer", e.target.value)}
            placeholder="Name or email"
          />
        </label>
      </div>
      <div className="bi-filters__row">
        <label>
          <span>Pipeline stage</span>
          <select
            value={value.pipelineStage}
            onChange={(e) => set("pipelineStage", e.target.value as BiFilters["pipelineStage"])}
          >
            <option value="all">All</option>
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {PIPELINE_STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Order status</span>
          <select
            value={value.orderStatus}
            onChange={(e) => set("orderStatus", e.target.value as BiFilters["orderStatus"])}
          >
            <option value="all">All</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Room type</span>
          <select value={value.roomType} onChange={(e) => set("roomType", e.target.value)}>
            <option value="all">All</option>
            {roomTypes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Furniture style</span>
          <select
            value={value.furnitureStyle}
            onChange={(e) => set("furnitureStyle", e.target.value)}
          >
            <option value="all">All</option>
            {styles.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Product category</span>
          <select
            value={value.productCategory}
            onChange={(e) => set("productCategory", e.target.value)}
          >
            <option value="all">All</option>
            <option value="Seating">Seating</option>
            <option value="Tables">Tables</option>
            <option value="Storage">Storage</option>
            <option value="Bedroom">Bedroom</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>
    </div>
  );
}
