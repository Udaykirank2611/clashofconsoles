import { useMemo, useState } from "react";
import { RANGE_LABELS, resolveRange, type RangePreset } from "@/lib/analytics/types";

export const RANGE_ORDER: RangePreset[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
  "custom",
];

export { RANGE_LABELS };

/** Date-range + branch scope shared by the analytics and reports views. */
export function useAnalyticsScope(defaultBranchId: string | null) {
  const [preset, setPreset] = useState<RangePreset>("this_month");
  const [custom, setCustom] = useState(() => resolveRange("this_month"));
  const [branchId, setBranchId] = useState<string | null>(defaultBranchId);
  const range = useMemo(() => resolveRange(preset, custom), [preset, custom]);
  return { preset, setPreset, custom, setCustom, branchId, setBranchId, range };
}

export type AnalyticsScope = ReturnType<typeof useAnalyticsScope>;
