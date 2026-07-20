/**
 * RC10.3 — Design preference soft-rank controls (controlled).
 */
import { useMemo } from "react";
import { CATALOGUE } from "../../../data/catalogue";
import { listCollections } from "../collections";
import type { DesignPreferences } from "../types";

const STYLE_OPTIONS = [
  "modern",
  "executive",
  "heritage",
  "scandinavian",
  "luxury",
  "minimal",
  "industrial",
  "contemporary",
] as const;

export type DesignPrefsBarProps = {
  readonly prefs: DesignPreferences;
  readonly onChange: (next: DesignPreferences) => void;
  readonly colorOptions?: readonly string[];
  readonly materialOptions?: readonly string[];
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function buildPrefs(parts: {
  style?: string;
  color?: string;
  material?: string;
  collection?: string;
}): DesignPreferences {
  return {
    ...(parts.style ? { style: parts.style } : {}),
    ...(parts.color ? { color: parts.color } : {}),
    ...(parts.material ? { material: parts.material } : {}),
    ...(parts.collection ? { collection: parts.collection } : {}),
  };
}

export function DesignPrefsBar({
  prefs,
  onChange,
  colorOptions,
  materialOptions,
}: DesignPrefsBarProps) {
  const collections = listCollections();
  const catalogOpts = useMemo(() => {
    const colors: string[] = [];
    const materials: string[] = [];
    for (const p of CATALOGUE) {
      if (p.color) colors.push(p.color);
      if (p.material) materials.push(p.material);
    }
    return { colors: uniqueSorted(colors), materials: uniqueSorted(materials) };
  }, []);
  const colors = colorOptions ? uniqueSorted(colorOptions) : catalogOpts.colors;
  const materials = materialOptions
    ? uniqueSorted(materialOptions)
    : catalogOpts.materials;

  function withField(field: keyof DesignPreferences, value: string) {
    onChange(
      buildPrefs({
        ...(field === "style" ? { style: value } : prefs.style ? { style: prefs.style } : {}),
        ...(field === "color" ? { color: value } : prefs.color ? { color: prefs.color } : {}),
        ...(field === "material"
          ? { material: value }
          : prefs.material
            ? { material: prefs.material }
            : {}),
        ...(field === "collection"
          ? { collection: value }
          : prefs.collection
            ? { collection: prefs.collection }
            : {}),
      }),
    );
  }

  function clearField(field: keyof DesignPreferences) {
    onChange(
      buildPrefs({
        ...(field !== "style" && prefs.style ? { style: prefs.style } : {}),
        ...(field !== "color" && prefs.color ? { color: prefs.color } : {}),
        ...(field !== "material" && prefs.material ? { material: prefs.material } : {}),
        ...(field !== "collection" && prefs.collection
          ? { collection: prefs.collection }
          : {}),
      }),
    );
  }

  return (
    <div className="cx-design-prefs-bar" role="group" aria-label="Design preferences">
      <label>
        Style
        <select
          value={prefs.style ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) clearField("style");
            else withField("style", v);
          }}
          aria-label="Style preference"
        >
          <option value="">Any style</option>
          {STYLE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label>
        Color
        <select
          value={prefs.color ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) clearField("color");
            else withField("color", v);
          }}
          aria-label="Color preference"
        >
          <option value="">Any color</option>
          {colors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label>
        Material
        <select
          value={prefs.material ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) clearField("material");
            else withField("material", v);
          }}
          aria-label="Material preference"
        >
          <option value="">Any material</option>
          {materials.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label>
        Collection
        <select
          value={prefs.collection ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) clearField("collection");
            else withField("collection", v);
          }}
          aria-label="Collection preference"
        >
          <option value="">Any collection</option>
          {collections.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
