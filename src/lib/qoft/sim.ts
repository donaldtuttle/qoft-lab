/**
 * In-browser port of the GU×QOFT n=2 calculus toy.
 *
 * DEVELOP Typed Realization of the QOFT boundary
 *   Ξ(ψ) = Πᴽ(ψ) ⊕ Γ(ψ; ctx)
 * Canonical weight: NONE. Not a canon amendment. Not a TOE.
 *
 * This toy (see docs/TYPED_REALIZATION.md):
 *   Ψtoy      := normalized complex scalar fields on the L×L lattice
 *   Ψᴽtoy     := Ψtoy
 *   Πᴽtoy(ψ)  := ψ                         (identity self-model, declared)
 *   Gtoy      := complex lattice update fields
 *   Γtoy(ψ;g) := α·(neighbor_avg(ψ)−ψ) + β·Φ_X(g)⊙ψ
 *   ⊕toy      := normalize(ψᴽ + γ)
 *   Ξtoy      := Πᴽtoy(ψ) ⊕toy Γtoy(ψ; g)
 *
 * Tick order is unchanged from v0.1.0:
 *   1. g ← g + ε σ  (symmetric 2-tensor; reject det ≤ 0)
 *   2. Φ_X = Φ_Y(x, g_t(x)) = tr(g) + 0.1 log det(g)
 *   3. ψ ← Ξtoy(ψ; g)     [same arithmetic as normalize(ψ + α Γ_nbr(ψ) + β Φ_X·ψ)]
 *   4. optional phase-flip intervention on ψ: C = collapseMetric(ψ);
 *      if C > λ_c, local × −1. Not canonical Λψ.
 *
 * λ_c = 1.67 is a toy/local threshold, not a QOFT universal constant.
 *
 * GU names are analogy only.
 * Model constraints (not one numeric check): Y==ψ, Shiab in C, 14 in C,
 * G==Y, retrieve-as-ID.
 * Out of scope: Shiab, G=H⋉N, spinors, U(64,64), n=4.
 *
 * Seeded JS engine is deterministic with itself (P5). It is not bit-identical
 * to the numpy PCG64 original — different RNG, same tick contract.
 */

export const LAB_VERSION = "0.1.1";

export const LAMBDA_C = 1.67;
export const EPS_DET = 1e-12;
export const EPS_RHO = 1e-12;
export const EPS_NORM = 1e-12;

export const TOY_TICKS = 32;
export const TOY_SEED = 7;
export const TOY_GRID = 8;

export const REALIZATION = {
  status: "DEVELOP",
  kind: "Typed Realization",
  canonicalWeight: "NONE",
  piReflex: "id",
  lambdaC: "toy/local threshold, not a QOFT universal constant",
  phaseFlip: "experiment-only intervention, not canonical Λψ",
} as const;

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
  /** ‖neighbor_avg(ψ) − ψ‖ after the tick. This is a Γ-neighbor norm, not Πᴽ. */
  gammaNorm: number;
  /** @deprecated alias of gammaNorm — kept so v0.1.0 CSVs/scripts still parse. */
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
  "gammaNorm",
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

export type ComplexField = { r: Float64Array; i: Float64Array };

/** Πᴽtoy(ψ) := ψ. Identity self-model — declared, not hidden. */
export function piReflexToy(psiR: Float64Array, psiI: Float64Array): ComplexField {
  return { r: psiR.slice(), i: psiI.slice() };
}

/** Neighbor-average minus ψ. The Γ_nbr stand-in used by Γtoy and by gammaNorm. */
export function neighborGamma(
  psiR: Float64Array,
  psiI: Float64Array,
  L: number,
): ComplexField {
  const N = L * L;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  for (let row = 0; row < L; row++) {
    const up = (row - 1 + L) % L;
    const down = (row + 1) % L;
    for (let col = 0; col < L; col++) {
      const left = (col - 1 + L) % L;
      const right = (col + 1) % L;
      const k = row * L + col;
      const ar =
        0.25 *
        (psiR[up * L + col] +
          psiR[down * L + col] +
          psiR[row * L + left] +
          psiR[row * L + right]);
      const ai =
        0.25 *
        (psiI[up * L + col] +
          psiI[down * L + col] +
          psiI[row * L + left] +
          psiI[row * L + right]);
      r[k] = ar - (psiR[k] ?? 0);
      i[k] = ai - (psiI[k] ?? 0);
    }
  }
  return { r, i };
}

/**
 * Γtoy(ψ; g) := α·(neighbor_avg(ψ)−ψ) + β·Φ_X(g)⊙ψ
 * `phi` is the already-pulled-back Φ_X(g). Gtoy is this complex update field.
 */
export function gammaToy(
  psiR: Float64Array,
  psiI: Float64Array,
  phi: Float64Array,
  L: number,
  alpha: number,
  beta: number,
): ComplexField {
  const nbr = neighborGamma(psiR, psiI, L);
  const N = L * L;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const pr = psiR[k] ?? 0;
    const pi = psiI[k] ?? 0;
    const ph = phi[k] ?? 0;
    r[k] = alpha * (nbr.r[k] ?? 0) + beta * (ph * pr);
    i[k] = alpha * (nbr.i[k] ?? 0) + beta * (ph * pi);
  }
  return { r, i };
}

/** ⊕toy(ψᴽ, γ) := normalize(ψᴽ + γ). Abstract fusion on a pre-summed γ. */
export function fuseToy(
  psiStarR: Float64Array,
  psiStarI: Float64Array,
  gammaR: Float64Array,
  gammaI: Float64Array,
): ComplexField {
  const N = psiStarR.length;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  let ns = 0;
  for (let k = 0; k < N; k++) {
    const nr = (psiStarR[k] ?? 0) + (gammaR[k] ?? 0);
    const ni = (psiStarI[k] ?? 0) + (gammaI[k] ?? 0);
    r[k] = nr;
    i[k] = ni;
    ns += nr * nr + ni * ni;
  }
  const inv = 1 / (Math.sqrt(ns) + EPS_NORM);
  for (let k = 0; k < N; k++) {
    r[k] *= inv;
    i[k] *= inv;
  }
  return { r, i };
}

/**
 * Ξtoy(ψ; g) — IEEE realization of Πᴽtoy(ψ) ⊕toy Γtoy(ψ; g).
 *
 * Implemented as the v0.1.0 left-associated three-term sum
 *   N( ψ + α Γ_nbr(ψ) + β Φ_X ⊙ ψ )
 * so the tick is bit-identical to the pre-declaration engine.
 * `fuseToy(piReflexToy(ψ), gammaToy(ψ))` is the abstract composition and
 * may differ by ulps: floating-point `+` is not associative.
 */
export function xiToy(
  psiR: Float64Array,
  psiI: Float64Array,
  phi: Float64Array,
  L: number,
  alpha: number,
  beta: number,
): ComplexField {
  const star = piReflexToy(psiR, psiI);
  const nbr = neighborGamma(star.r, star.i, L);
  const N = L * L;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  let ns = 0;
  for (let k = 0; k < N; k++) {
    const pr = star.r[k] ?? 0;
    const pi = star.i[k] ?? 0;
    const nr = pr + alpha * (nbr.r[k] ?? 0) + beta * ((phi[k] ?? 0) * pr);
    const ni = pi + alpha * (nbr.i[k] ?? 0) + beta * ((phi[k] ?? 0) * pi);
    r[k] = nr;
    i[k] = ni;
    ns += nr * nr + ni * ni;
  }
  const inv = 1 / (Math.sqrt(ns) + EPS_NORM);
  for (let k = 0; k < N; k++) {
    r[k] *= inv;
    i[k] *= inv;
  }
  return { r, i };
}

/**
 * Collapse / intervention metric. Inputs are ψ only — no metric, no fiber,
 * no dim(Y), no 14, no Shiab. C = |ψ|² / (ρ + ε), ρ = site-mean |ψ|².
 */
export function collapseMetric(
  psiR: ArrayLike<number>,
  psiI: ArrayLike<number>,
): { C: Float64Array; Cmax: number; rho: number } {
  const N = psiR.length;
  let rho = 0;
  for (let k = 0; k < N; k++) {
    const pr = psiR[k] ?? 0;
    const pi = psiI[k] ?? 0;
    rho += pr * pr + pi * pi;
  }
  rho /= N;
  const C = new Float64Array(N);
  let Cmax = 0;
  for (let k = 0; k < N; k++) {
    const pr = psiR[k] ?? 0;
    const pi = psiI[k] ?? 0;
    const ck = (pr * pr + pi * pi) / (rho + EPS_RHO);
    C[k] = ck;
    if (ck > Cmax) Cmax = ck;
  }
  return { C, Cmax, rho };
}

/**
 * Experiment-only local phase flip (× −1). Preserves |ψ|², is involutive,
 * and is not a realization of canonical Λψ.
 */
export function phaseFlipIntervention(
  psiR: Float64Array,
  psiI: Float64Array,
  C: Float64Array,
  lambda: number,
): number {
  let flipped = 0;
  for (let k = 0; k < C.length; k++) {
    if ((C[k] ?? 0) > lambda) {
      psiR[k] *= -1;
      psiI[k] *= -1;
      flipped = 1;
    }
  }
  return flipped;
}

/** Mechanically tested P4: C is a function of ψ only. */
export function p4IsolationOk(): boolean {
  if (collapseMetric.length !== 2) return false;
  const src = Function.prototype.toString.call(collapseMetric);
  if (src.includes("14")) return false;
  const lambda: number = LAMBDA_C;
  if (lambda === 14 || lambda === fiberDim(4) + 4) return false;
  return true;
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
    const { g, psiR, psiI, phi, det } = this;
    const N = this.L * this.L;
    for (let k = 0; k < N; k++) {
      const a = g[k * 3];
      const b = g[k * 3 + 1];
      const c = g[k * 3 + 2];
      const d = a * c - b * b;
      det[k] = d;
      phi[k] = a + c + 0.1 * Math.log(Math.max(d, EPS_DET));
    }
    const { C } = collapseMetric(psiR, psiI);
    this.C.set(C);
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

  /** Ξtoy on the current (ψ, Φ_X(g)). */
  private qoftTick(): void {
    const { psiR, psiI, phi, L } = this;
    const { alpha, beta } = this.cfg;
    const next = xiToy(psiR, psiI, phi, L, alpha, beta);
    this.psiR.set(next.r);
    this.psiI.set(next.i);
  }

  private collapseGate(): { Cmax: number; collapsed: number } {
    const { C, Cmax } = collapseMetric(this.psiR, this.psiI);
    this.C.set(C);
    let collapsed = 0;
    if (this.cfg.collapse) {
      collapsed = phaseFlipIntervention(this.psiR, this.psiI, C, LAMBDA_C);
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
    const nbr = neighborGamma(psiR, psiI, L);
    let state = 0;
    let gammaN = 0;
    let detMin = Infinity;
    let pull = 0;
    for (let k = 0; k < N; k++) {
      state += psiR[k] * psiR[k] + psiI[k] * psiI[k];
      gammaN += (nbr.r[k] ?? 0) * (nbr.r[k] ?? 0) + (nbr.i[k] ?? 0) * (nbr.i[k] ?? 0);
      if (det[k] < detMin) detMin = det[k];
      pull += phi[k];
    }
    const gNorm = Math.sqrt(gammaN);
    const row: TelemetryRow = {
      t: this.t,
      stateNorm: Math.sqrt(state),
      gammaNorm: gNorm,
      reflexNorm: gNorm,
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
  if (!p4IsolationOk()) fails.push("P4 collapse-metric isolation");
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
