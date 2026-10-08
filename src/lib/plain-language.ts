import type { TelemetryRow } from "./qoft/sim.ts";

export const PLAIN_LAYERS = [
  { id: "composite", label: "Composite" },
  { id: "observer", label: "Field amplitude" },
  { id: "metric", label: "Metric ellipses" },
  { id: "fiber", label: "Matrix components" },
  { id: "collapse", label: "Relative intensity" },
  { id: "pullback", label: "Geometry signal" },
] as const;

export const PLAIN_CHECKS = [
  { id: "P1", name: "Grid pairing", hint: "Every matrix remains paired with its original grid coordinates." },
  { id: "P2", name: "Positive determinants", hint: "All stored metric determinants are positive." },
  { id: "P3", name: "Three matrix components", hint: "A symmetric 2 by 2 matrix stores two diagonal entries and one shared off-diagonal entry." },
  { id: "P4", name: "Intensity rule guard", hint: "Checks finite peak intensity, function signature, and limited source guards. This is not a complete dependency audit." },
  { id: "P5", name: "Repeatable run", hint: "Two runs with the same seed and settings produce identical recorded measurements." },
  { id: "P6", name: "No flips when disabled", hint: "With the phase flip disabled, every step records a zero event flag. Not applicable while enabled." },
] as const;

export const PLAIN_SERIES_LABELS: Record<string, string> = {
  C_max: "Peak relative intensity",
  det_g_min: "Minimum determinant",
  pullback_mean: "Mean geometry signal",
  gammaNbrNorm: "Neighbor difference norm",
};

// A separate export schema. Historical CSV headers and aliases stay unchanged.
export const PLAIN_CSV_FIELDS: readonly [string, keyof TelemetryRow][] = [
  ["step_index", "t"],
  ["field_norm", "stateNorm"],
  ["neighbor_difference_norm", "gammaNbrNorm"],
  ["minimum_metric_determinant", "det_g_min"],
  ["mean_geometry_signal", "pullback_mean"],
  ["peak_relative_intensity", "C_max"],
  ["phase_flip_occurred", "collapsed"],
  ["grid_pairing_ok", "section_law_ok"],
];

export function telemetryToPlainCsv(rows: TelemetryRow[]): string {
  const header = PLAIN_CSV_FIELDS.map(([label]) => label).join(",");
  const body = rows.map((row) => PLAIN_CSV_FIELDS.map(([, key]) => String(row[key])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}
