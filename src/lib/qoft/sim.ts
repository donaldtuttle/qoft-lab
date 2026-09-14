/**
 * In-browser port of the GU×QOFT n=2 calculus toy.
 *
 * Tick contract (ψ only; metric on ι = g):
 *   1. g ← g + ε σ  (symmetric 2-tensor; reject det ≤ 0)
 *   2. Φ_X = Φ_Y(x, g_t(x)) = tr(g) + 0.1 log det(g)
 *   3. ψ ← normalize(ψ + α Γ(ψ) + β Φ_X · ψ)
 *   4. optional collapse: C = |ψ|² / (ρ+ε); if C > λ_c, local phase flip
 *
 * GU names are analogy only. Not a TOE.
 * Banned in the dynamics: Y==ψ, Shiab in C, 14 in C, G==Y, retrieve-as-ID.
 * Out of scope: Shiab, G=H⋉N, spinors, U(64,64), n=4.
 *
 * Seeded JS engine is deterministic with itself (P5). It is not bit-identical
 * to the numpy PCG64 original — different RNG, same tick contract.
 */

export const LAMBDA_C = 1.67;
export const EPS_DET = 1e-12;
export const EPS_RHO = 1e-12;
export const EPS_NORM = 1e-12;

export const TOY_TICKS = 32;
export const TOY_SEED = 7;
export const TOY_GRID = 8;

export type Config = {
  seed: number;
  n: number;
  collapse: boolean;
  grid: number;
  epsilonG: number;
  alpha: number;
  beta: number;
};

export const DEFAULT_CONFIG: Config = {
  seed: TOY_SEED,
  n: 2,
  collapse: false,
  grid: 16,
  epsilonG: 0.02,
  alpha: 0.15,
  beta: 0.05,
};

export const V0_CONFIG: Config = {
  seed: TOY_SEED,
  n: 2,
  collapse: false,
  grid: TOY_GRID,
  epsilonG: 0.02,
  alpha: 0.15,
  beta: 0.05,
};

export type TelemetryRow = {
  t: number;
  stateNorm: number;
  reflexNorm: number;
  det_g_min: number;
  pullback_mean: number;
  C_max: number;
  collapsed: number;
  section_law_ok: number;
};

export const CSV_FIELDS: (keyof TelemetryRow)[] = [
  "t",
  "stateNorm",
  "reflexNorm",
  "det_g_min",
  "pullback_mean",
  "C_max",
  "collapsed",
  "section_law_ok",
];

export function fiberDim(n: number): number {
  return (n * (n + 1)) >> 1;
}

/** sfc32 — small, seedable, good enough for a calculus toy. */
export class SeededRng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(seed: number) {
    let s = seed >>> 0;
    this.a = s;
    this.b = (s ^ 0x9e3779b9) >>> 0;
    this.c = (s + 0x6a09e667) >>> 0;
    this.d = (s ^ 0xa54ff53a) >>> 0;
    for (let i = 0; i < 15; i++) this.next();
  }

  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    const t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    const r = (t + this.d) | 0;
    this.c = (this.c + r) | 0;
    return (r >>> 0) / 4294967296;
  }

  gaussian(): number {
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

export type CheckResult = {
  ok: boolean;
  fails: string[];
  p5: boolean;
};

function assertV0(cfg: Config): void {
  if (cfg.n !== 2) {
    throw new Error("v0 only supports n = 2 (n=4 is out of scope)");
  }
  if (fiberDim(cfg.n) !== 3) {
    throw new Error("P3: n=2 fiber must have exactly 3 components");
  }
}

export class QoftSim {
  cfg: Config;
  L: number;
  rng: SeededRng;
  g: Float64Array;
  psiR: Float64Array;
  psiI: Float64Array;
  phi: Float64Array;
  C: Float64Array;
  det: Float64Array;
  t = 0;
  last: TelemetryRow | null = null;

  constructor(cfg: Config) {
    assertV0(cfg);
    this.cfg = { ...cfg };
    this.L = cfg.grid;
    this.rng = new SeededRng(cfg.seed);
    const N = this.L * this.L;
    this.g = new Float64Array(N * 3);
    this.psiR = new Float64Array(N);
    this.psiI = new Float64Array(N);
    this.phi = new Float64Array(N);
    this.C = new Float64Array(N);
    this.det = new Float64Array(N);
    this.initState();
  }

  reset(cfg?: Partial<Config>): void {
    if (cfg) this.cfg = { ...this.cfg, ...cfg };
    assertV0(this.cfg);
    this.L = this.cfg.grid;
    this.rng = new SeededRng(this.cfg.seed);
    const N = this.L * this.L;
    this.g = new Float64Array(N * 3);
    this.psiR = new Float64Array(N);
    this.psiI = new Float64Array(N);
    this.phi = new Float64Array(N);
    this.C = new Float64Array(N);
    this.det = new Float64Array(N);
    this.t = 0;
    this.last = null;
    this.initState();
  }

  private initState(): void {
    const { L, rng, g, psiR, psiI } = this;
    const N = L * L;
    for (let k = 0; k < N; k++) {
      g[k * 3] = 1 + 0.05 * rng.gaussian();
      g[k * 3 + 1] = 0.05 * rng.gaussian();
      g[k * 3 + 2] = 1 + 0.05 * rng.gaussian();
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      let bad = false;
      for (let k = 0; k < N; k++) {
        const a = g[k * 3];
        const b = g[k * 3 + 1];
        const c = g[k * 3 + 2];
        if (a * c - b * b <= 0) {
          g[k * 3] = Math.abs(a) + 1;
          g[k * 3 + 1] = 0;
          g[k * 3 + 2] = Math.abs(c) + 1;
          bad = true;
        }
      }
      if (!bad) break;
    }
    let ns = 0;
    for (let k = 0; k < N; k++) {
      psiR[k] = rng.gaussian();
      psiI[k] = rng.gaussian();
      ns += psiR[k] * psiR[k] + psiI[k] * psiI[k];
    }
    const inv = 1 / (Math.sqrt(ns) + EPS_NORM);
    for (let k = 0; k < N; k++) {
      psiR[k] *= inv;
      psiI[k] *= inv;
    }
    this.refreshDerived();
  }

  private refreshDerived(): void {
    const { g, psiR, psiI, phi, C, det } = this;
    const N = this.L * this.L;
    let rho = 0;
    for (let k = 0; k < N; k++) {
      const a = g[k * 3];
      const b = g[k * 3 + 1];
      const c = g[k * 3 + 2];
      const d = a * c - b * b;
      det[k] = d;
      phi[k] = a + c + 0.1 * Math.log(Math.max(d, EPS_DET));
      rho += psiR[k] * psiR[k] + psiI[k] * psiI[k];
    }
    rho /= N;
    for (let k = 0; k < N; k++) {
      const mag2 = psiR[k] * psiR[k] + psiI[k] * psiI[k];
      C[k] = mag2 / (rho + EPS_RHO);
    }
  }

  private metricStep(): void {
    const { g, rng, L } = this;
    const eps = this.cfg.epsilonG;
    const N = L * L;
    for (let k = 0; k < N; k++) {
      let s0 = rng.gaussian();
      const s1 = rng.gaussian();
      let s2 = rng.gaussian();
      const tr = s0 + s2;
      s0 -= 0.5 * tr;
      s2 -= 0.5 * tr;
      const a = g[k * 3] + eps * s0;
      const b = g[k * 3 + 1] + eps * s1;
      const c = g[k * 3 + 2] + eps * s2;
      if (a * c - b * b > 0) {
        g[k * 3] = a;
        g[k * 3 + 1] = b;
        g[k * 3 + 2] = c;
      }
    }
  }

  private gammaInto(outR: Float64Array, outI: Float64Array): void {
    const { psiR, psiI, L } = this;
    for (let i = 0; i < L; i++) {
      const up = (i - 1 + L) % L;
      const down = (i + 1) % L;
      for (let j = 0; j < L; j++) {
        const left = (j - 1 + L) % L;
        const right = (j + 1) % L;
        const k = i * L + j;
        const ar =
          0.25 *
          (psiR[up * L + j] +
            psiR[down * L + j] +
            psiR[i * L + left] +
            psiR[i * L + right]);
        const ai =
          0.25 *
          (psiI[up * L + j] +
            psiI[down * L + j] +
            psiI[i * L + left] +
            psiI[i * L + right]);
        outR[k] = ar - psiR[k];
        outI[k] = ai - psiI[k];
      }
    }
  }

  private qoftTick(): void {
    const { psiR, psiI, phi, L } = this;
    const { alpha, beta } = this.cfg;
    const N = L * L;
    const gR = new Float64Array(N);
    const gI = new Float64Array(N);
    this.gammaInto(gR, gI);
    let ns = 0;
    for (let k = 0; k < N; k++) {
      const nr = psiR[k] + alpha * gR[k] + beta * (phi[k] * psiR[k]);
      const ni = psiI[k] + alpha * gI[k] + beta * (phi[k] * psiI[k]);
      psiR[k] = nr;
      psiI[k] = ni;
      ns += nr * nr + ni * ni;
    }
    const inv = 1 / (Math.sqrt(ns) + EPS_NORM);
    for (let k = 0; k < N; k++) {
      psiR[k] *= inv;
      psiI[k] *= inv;
    }
  }

  private collapseGate(): { Cmax: number; collapsed: number } {
    const { psiR, psiI, C, L } = this;
    const N = L * L;
    let rho = 0;
    for (let k = 0; k < N; k++) {
      rho += psiR[k] * psiR[k] + psiI[k] * psiI[k];
    }
    rho /= N;
    let Cmax = 0;
    let collapsed = 0;
    for (let k = 0; k < N; k++) {
      const mag2 = psiR[k] * psiR[k] + psiI[k] * psiI[k];
      const ck = mag2 / (rho + EPS_RHO);
      C[k] = ck;
      if (ck > Cmax) Cmax = ck;
      if (this.cfg.collapse && ck > LAMBDA_C) {
        psiR[k] *= -1;
        psiI[k] *= -1;
        collapsed = 1;
      }
    }
    return { Cmax, collapsed };
  }

  private sectionLawOk(): number {
    return this.g.length === this.L * this.L * fiberDim(2) ? 1 : 0;
  }

  step(): TelemetryRow {
    this.metricStep();
    this.refreshDerived();
    this.qoftTick();
    const { Cmax, collapsed } = this.collapseGate();
    this.refreshDerived();

    const { psiR, psiI, det, phi, L } = this;
    const N = L * L;
    const gR = new Float64Array(N);
    const gI = new Float64Array(N);
    this.gammaInto(gR, gI);
    let state = 0;
    let reflex = 0;
    let detMin = Infinity;
    let pull = 0;
    for (let k = 0; k < N; k++) {
      state += psiR[k] * psiR[k] + psiI[k] * psiI[k];
      reflex += gR[k] * gR[k] + gI[k] * gI[k];
      if (det[k] < detMin) detMin = det[k];
      pull += phi[k];
    }
    const row: TelemetryRow = {
      t: this.t,
      stateNorm: Math.sqrt(state),
      reflexNorm: Math.sqrt(reflex),
      det_g_min: detMin,
      pullback_mean: pull / N,
      C_max: Cmax,
      collapsed,
      section_law_ok: this.sectionLawOk(),
    };
    this.last = row;
    this.t += 1;
    return row;
  }

  overThreshold(): number {
    let n = 0;
    for (let k = 0; k < this.C.length; k++) {
      if (this.C[k] > LAMBDA_C) n++;
    }
    return n;
  }
}

function rowsEqual(a: TelemetryRow[], b: TelemetryRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (!x || !y) return false;
    for (const f of CSV_FIELDS) {
      if (x[f] !== y[f]) return false;
    }
  }
  return true;
}

export function checkPass(
  rows: TelemetryRow[],
  cfg: Config,
  p5: boolean,
): CheckResult {
  const fails: string[] = [];
  if (!rows.every((r) => r.section_law_ok === 1)) fails.push("P1 section_law");
  if (!rows.every((r) => r.det_g_min > 0)) fails.push("P2 det_g");
  if (fiberDim(cfg.n) !== 3) fails.push("P3 fiber");
  if (rows.some((r) => !Number.isFinite(r.C_max))) fails.push("P4 C_max nonfinite");
  const lambda: number = LAMBDA_C;
  if (lambda === 14 || lambda === fiberDim(4) + 4) {
    fails.push("P4 banned constant in lambda");
  }
  if (!p5) fails.push("P5 deterministic");
  if (!cfg.collapse && rows.some((r) => r.collapsed !== 0)) {
    fails.push("P6 collapse-off");
  }
  return { ok: fails.length === 0, fails, p5 };
}

export function runToy(
  cfg: Config,
  ticks = TOY_TICKS,
): { rows: TelemetryRow[]; result: CheckResult } {
  const a = new QoftSim(cfg);
  const rowsA: TelemetryRow[] = [];
  for (let i = 0; i < ticks; i++) rowsA.push(a.step());
  const b = new QoftSim(cfg);
  const rowsB: TelemetryRow[] = [];
  for (let i = 0; i < ticks; i++) rowsB.push(b.step());
  const p5 = rowsEqual(rowsA, rowsB);
  return { rows: rowsA, result: checkPass(rowsA, cfg, p5) };
}

export function telemetryToCsv(rows: TelemetryRow[]): string {
  const header = CSV_FIELDS.join(",");
  const body = rows
    .map((r) => CSV_FIELDS.map((f) => String(r[f])).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

export function csvFilename(cfg: Config, ticks: number): string {
  return `telemetry_seed${cfg.seed}_ticks${ticks}_collapse${cfg.collapse ? "on" : "off"}.csv`;
}

export function sampleAt(sim: QoftSim, i: number, j: number) {
  const k = i * sim.L + j;
  const g11 = sim.g[k * 3] ?? 0;
  const g12 = sim.g[k * 3 + 1] ?? 0;
  const g22 = sim.g[k * 3 + 2] ?? 0;
  const pr = sim.psiR[k] ?? 0;
  const pi = sim.psiI[k] ?? 0;
  return {
    i,
    j,
    g11,
    g12,
    g22,
    det: sim.det[k] ?? 0,
    phi: sim.phi[k] ?? 0,
    psiR: pr,
    psiI: pi,
    mag: Math.hypot(pr, pi),
    phase: Math.atan2(pi, pr),
    C: sim.C[k] ?? 0,
  };
}

export type SiteSample = ReturnType<typeof sampleAt>;
