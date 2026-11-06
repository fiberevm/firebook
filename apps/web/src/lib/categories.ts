import type { CategoryBreakdown } from "@accounting/shared";

// validated categorical order (adjacent-pair CVD separation >= 8 on a white surface).
// Slots are handed out in this fixed order and never cycled.
const PALETTE = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"];
const OTHER_COLOR = "#78716c";
const UNCATEGORIZED_COLOR = "#c4c2bc";

export const UNCATEGORIZED = "__uncategorized__";
export const OTHER = "__other__";

export type CategoryInfo = {
  // the category name, or UNCATEGORIZED for entries without one
  key: string;
  label: string;
  // the series this category is drawn in: itself, or OTHER once the palette runs out
  series: string;
  color: string;
  total: number;
};

export type Series = { key: string; label: string; color: string };

export const categoryKey = (category: string | null) => category ?? UNCATEGORIZED;

/**
 * Assigns each category in the breakdown a color by its total volume, so the
 * biggest categories get the strongest slots. Colors depend only on the data,
 * never on which categories are toggled, so hiding one does not repaint the rest.
 */
export function describeCategories(rows: CategoryBreakdown["rows"]): { categories: CategoryInfo[]; series: Series[] } {
  const totals = new Map<string, number>();
  for (const r of rows) {
    const key = categoryKey(r.category);
    totals.set(key, (totals.get(key) ?? 0) + r.sumUsd);
  }

  const named = [...totals].filter(([key]) => key !== UNCATEGORIZED).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  // with more categories than colors, the last slot becomes "Other"
  const colored = named.length > PALETTE.length ? PALETTE.length - 1 : named.length;

  const categories: CategoryInfo[] = named.map(([key, total], i) => ({
    key,
    label: key,
    series: i < colored ? key : OTHER,
    color: i < colored ? PALETTE[i]! : OTHER_COLOR,
    total,
  }));
  if (totals.has(UNCATEGORIZED)) {
    categories.push({ key: UNCATEGORIZED, label: "Uncategorized", series: UNCATEGORIZED, color: UNCATEGORIZED_COLOR, total: totals.get(UNCATEGORIZED)! });
  }

  // stacking order: colored categories, then Other, then Uncategorized
  const series: Series[] = categories.filter((c) => c.series === c.key && c.key !== UNCATEGORIZED).map((c) => ({ key: c.key, label: c.label, color: c.color }));
  if (named.length > colored) series.push({ key: OTHER, label: "Other", color: OTHER_COLOR });
  if (totals.has(UNCATEGORIZED)) series.push({ key: UNCATEGORIZED, label: "Uncategorized", color: UNCATEGORIZED_COLOR });

  return { categories, series };
}
