import { create } from "zustand";
import {
  csvFilename,
  DEFAULT_CONFIG,
  QoftSim,
  runToy,
  telemetryToCsv,
  TOY_TICKS,
  V0_CONFIG,
  type CheckResult,
  type Config,
  type SiteSample,
  type TelemetryRow,
  sampleAt,
} from "@/lib/qoft/sim";

export type Layer =
  | "composite"
  | "observer"
  | "metric"
  | "fiber"
  | "collapse"
  | "pullback";

export const LAYERS: { id: Layer; label: string }[] = [
  { id: "composite", label: "Composite" },
  { id: "observer", label: "Observer ψ" },
  { id: "metric", label: "Metric ι" },
  { id: "fiber", label: "Fiber RGB" },
  { id: "collapse", label: "Collapse C" },
  { id: "pullback", label: "Pullback Φ" },
];

const HISTORY_CAP = 256;

let sim: QoftSim | null = null;

export function getSim(): QoftSim {
  if (!sim) sim = new QoftSim(DEFAULT_CONFIG);
  return sim;
}

type LabState = {
  ready: boolean;
  config: Config;
  playing: boolean;
  speed: number;
  layer: Layer;
  tick: number;
  last: TelemetryRow | null;
  telemetry: TelemetryRow[];
  result: CheckResult | null;
  hover: SiteSample | null;
  pinned: SiteSample | null;
  logLine: string;
  init: () => void;
  setPlaying: (v: boolean) => void;
  setSpeed: (v: number) => void;
  setLayer: (v: Layer) => void;
  patchConfig: (patch: Partial<Config>, reset?: boolean) => void;
  applyV0: () => void;
  reset: () => void;
  step: () => void;
  toyRun: () => void;
  setHoverCell: (i: number | null, j: number | null) => void;
  pinHover: () => void;
  exportCsv: () => void;
};

function pushRow(rows: TelemetryRow[], row: TelemetryRow): TelemetryRow[] {
  const next =
    rows.length >= HISTORY_CAP
      ? rows.slice(rows.length - HISTORY_CAP + 1)
      : rows.slice();
  next.push(row);
  return next;
}

export const useLab = create<LabState>()((set, get) => ({
  ready: false,
  config: DEFAULT_CONFIG,
  playing: false,
  speed: 12,
  layer: "composite",
  tick: 0,
  last: null,
  telemetry: [],
  result: null,
  hover: null,
  pinned: null,
  logLine: "Idle — press Toy run for a 32-tick P1–P6 check. Canonical weight: NONE.",
  init: () => {
    sim = new QoftSim(get().config);
    set({
      ready: true,
      tick: 0,
      last: null,
      telemetry: [],
      result: null,
      hover: null,
      pinned: null,
      playing: false,
    });
  },
  setPlaying: (v) => set({ playing: v, result: v ? null : get().result }),
  setSpeed: (v) => set({ speed: v }),
  setLayer: (v) => set({ layer: v }),
  patchConfig: (patch, reset = true) => {
    const config = { ...get().config, ...patch };
    set({ config });
    if (reset) {
      get().reset();
      return;
    }
    if (sim) sim.cfg = { ...sim.cfg, ...patch };
  },
  applyV0: () => {
    set({ config: { ...V0_CONFIG } });
    get().reset();
    set({
      logLine: "Loaded v0 defaults · grid 8 · seed 7 · phase-flip off",
    });
  },
  reset: () => {
    const { config } = get();
    getSim().reset(config);
    set({
      tick: 0,
      last: null,
      telemetry: [],
      result: null,
      hover: null,
      pinned: null,
      playing: false,
      logLine: `Reset · seed ${config.seed} · grid ${config.grid}×${config.grid} · phase-flip ${config.collapse ? "on" : "off"}`,
    });
  },
  step: () => {
    const s = getSim();
    const row = s.step();
    set((state) => ({
      tick: s.t,
      last: row,
      telemetry: pushRow(state.telemetry, row),
      result: null,
      hover: state.hover ? sampleAt(s, state.hover.i, state.hover.j) : null,
      pinned: state.pinned ? sampleAt(s, state.pinned.i, state.pinned.j) : null,
    }));
  },
  toyRun: () => {
    const { config } = get();
    const { rows, result } = runToy(config, TOY_TICKS);
    sim = new QoftSim(config);
    for (let i = 0; i < rows.length; i++) sim.step();
    const status = result.ok ? "PASS" : "FAIL";
    const fails = result.fails.length ? result.fails.join(", ") : "[]";
    const out = csvFilename(config, TOY_TICKS);
    set({
      playing: false,
      tick: sim.t,
      last: rows[rows.length - 1] ?? null,
      telemetry: rows,
      result,
      logLine: `${status} P1–P6 fails=${fails} out=${out}`,
    });
  },
  setHoverCell: (i, j) => {
    if (i === null || j === null) {
      if (get().hover) set({ hover: null });
      return;
    }
    const cur = get().hover;
    if (cur && cur.i === i && cur.j === j) return;
    set({ hover: sampleAt(getSim(), i, j) });
  },
  pinHover: () => {
    const { hover } = get();
    if (hover) set({ pinned: hover });
  },
  exportCsv: () => {
    const { telemetry, config } = get();
    if (telemetry.length === 0) return;
    const csv = telemetryToCsv(telemetry);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename(config, telemetry.length);
    a.click();
    URL.revokeObjectURL(url);
  },
}));
