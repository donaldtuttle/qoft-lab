/**
 * Deterministic complex lattice simulation with periodic four-neighbor coupling.
 * Each site stores a complex scalar and three symmetric 2x2 matrix components.
 * Tick order: matrix perturbation, coupling calculation, normalized field update,
 * optional local phase flip. Arithmetic order is preserved from the source.
 * See docs/MODEL.md and ORIGINS.md for the contract and migration boundary.
 */

export const LAB_VERSION = "0.2.0";

export const PHASE_FLIP_THRESHOLD = 1.67;
export const EPS_DET = 1e-12;
export const EPS_POWER = 1e-12;
export const EPS_NORM = 1e-12;

export const CHECK_TICKS = 32;
export const REFERENCE_SEED = 7;
export const REFERENCE_GRID = 8;

export const TELEMETRY_SCHEMA_VERSION = 2;

export const MODEL = {
  kind: "complex lattice simulation",
  boundary: "periodic",
  neighborhood: "four orthogonal neighbors",
  normalization: "global L2 norm with 1e-12 stabilizer",
  phaseFlipThreshold: PHASE_FLIP_THRESHOLD,
} as const;

/** Golden fixture provenance. Regression fixture, not a third-party forensic pin. */
export const GOLDEN_FIXTURE = {
  path: "src/lib/lattice/fixtures/v0.1.0-toy-seed7.csv",
  kind: "golden fixture",
  sourceCommit: "c344023c8d7e7d0939f3513d617e24c17fddb2fe",
  engine: "original TypeScript engine at sourceCommit",
  config: "REFERENCE_CONFIG seed=7 grid=8 phaseFlipEnabled=off ticks=32",
  sha256: "8b9ddbaed92ac9818fc46a219e1a256393eee77468e7b3b9b79656ade2620f53",
} as const;

export type Config = {
  seed: number;
  n: number;
  phaseFlipEnabled: boolean;
  grid: number;
  matrixStepSize: number;
  neighborWeight: number;
  matrixWeight: number;
};

export const DEFAULT_CONFIG: Config = {
  seed: REFERENCE_SEED,
  n: 2,
  phaseFlipEnabled: false,
  grid: 16,
  matrixStepSize: 0.02,
  neighborWeight: 0.15,
  matrixWeight: 0.05,
};

export const REFERENCE_CONFIG: Config = {
  seed: REFERENCE_SEED,
  n: 2,
  phaseFlipEnabled: false,
  grid: REFERENCE_GRID,
  matrixStepSize: 0.02,
  neighborWeight: 0.15,
  matrixWeight: 0.05,
};

export type TelemetryRow = {
  schemaVersion: typeof TELEMETRY_SCHEMA_VERSION;
  tick: number;
  stateNorm: number;
  /** L2 norm of neighbor-average minus field, measured after the tick. */
  neighborResidualNorm: number;
  minDeterminant: number;
  meanMatrixCoupling: number;
  maxRelativePower: number;
  phaseFlipApplied: number;
  siteMappingOk: number;
};

export const CSV_FIELDS: (keyof TelemetryRow)[] = [
  "schemaVersion",
  "tick",
  "stateNorm",
  "neighborResidualNorm",
  "minDeterminant",
  "meanMatrixCoupling",
  "maxRelativePower",
  "phaseFlipApplied",
  "siteMappingOk",
];

export function symmetricComponentCount(n: number): number {
  return (n * (n + 1)) >> 1;
}

/** Seeded sfc32 pseudorandom generator; not cryptographically secure. */
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
    const tick = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    const r = (tick + this.d) | 0;
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

function assertSupportedDimension(cfg: Config): void {
  if (cfg.n !== 2) {
    throw new Error("Only spatial dimension n = 2 is supported");
  }
  if (symmetricComponentCount(cfg.n) !== 3) {
    throw new Error("P3: a symmetric 2x2 matrix stores exactly 3 components");
  }
}

export type ComplexField = { r: Float64Array; i: Float64Array };

export type Site = { i: number; j: number };
export type MatrixSite = { x: Site; matrices: [number, number, number] };

/** Copy both component arrays without changing their values. */
export function copyField(fieldReal: Float64Array, fieldImag: Float64Array): ComplexField {
  return { r: fieldReal.slice(), i: fieldImag.slice() };
}

/** Return the stored grid coordinates of a matrix record. */
export function siteCoordinates(s: MatrixSite): Site {
  return s.x;
}

/** Read a matrix and its stored coordinates from a grid slot. */
export function matrixAt(
  matrices: Float64Array,
  siteI: ArrayLike<number>,
  siteJ: ArrayLike<number>,
  L: number,
  i: number,
  j: number,
): MatrixSite {
  const k = i * L + j;
  return {
    x: { i: Number(siteI[k]), j: Number(siteJ[k]) },
    matrices: [matrices[k * 3] ?? 0, matrices[k * 3 + 1] ?? 0, matrices[k * 3 + 2] ?? 0],
  };
}

/** Check coordinate-to-slot consistency, unique coverage, and finite matrix components. */
export function siteMappingHolds(
  matrices: Float64Array,
  siteI: ArrayLike<number>,
  siteJ: ArrayLike<number>,
  L: number,
): boolean {
  const N = L * L;
  if (matrices.length !== N * symmetricComponentCount(2)) return false;
  if (siteI.length !== N || siteJ.length !== N) return false;
  const seen = new Set<string>();
  for (let i = 0; i < L; i++) {
    for (let j = 0; j < L; j++) {
      const s = matrixAt(matrices, siteI, siteJ, L, i, j);
      const x = siteCoordinates(s);
      if (x.i !== i || x.j !== j) return false;
      if (!Number.isFinite(s.matrices[0]) || !Number.isFinite(s.matrices[1]) || !Number.isFinite(s.matrices[2])) {
        return false;
      }
      const key = `${x.i},${x.j}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
  }
  return seen.size === N;
}

/** Periodic four-neighbor average minus the current complex field. */
export function neighborResidual(
  fieldReal: Float64Array,
  fieldImag: Float64Array,
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
        (fieldReal[up * L + col] +
          fieldReal[down * L + col] +
          fieldReal[row * L + left] +
          fieldReal[row * L + right]);
      const ai =
        0.25 *
        (fieldImag[up * L + col] +
          fieldImag[down * L + col] +
          fieldImag[row * L + left] +
          fieldImag[row * L + right]);
      r[k] = ar - (fieldReal[k] ?? 0);
      i[k] = ai - (fieldImag[k] ?? 0);
    }
  }
  return { r, i };
}

/** Weighted neighbor residual plus pointwise matrix coupling. No normalization. */
export function computeUpdate(
  fieldReal: Float64Array,
  fieldImag: Float64Array,
  couplingField: Float64Array,
  L: number,
  neighborWeight: number,
  matrixWeight: number,
): ComplexField {
  const nbr = neighborResidual(fieldReal, fieldImag, L);
  const N = L * L;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  for (let k = 0; k < N; k++) {
    const pr = fieldReal[k] ?? 0;
    const pi = fieldImag[k] ?? 0;
    const ph = couplingField[k] ?? 0;
    r[k] = neighborWeight * (nbr.r[k] ?? 0) + matrixWeight * (ph * pr);
    i[k] = neighborWeight * (nbr.i[k] ?? 0) + matrixWeight * (ph * pi);
  }
  return { r, i };
}

/** Add a precomputed update, then divide by its global L2 norm plus EPS_NORM. */
export function addAndNormalize(
  baseReal: Float64Array,
  baseImag: Float64Array,
  updateReal: Float64Array,
  updateImag: Float64Array,
): ComplexField {
  const N = baseReal.length;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  let ns = 0;
  for (let k = 0; k < N; k++) {
    const nr = (baseReal[k] ?? 0) + (updateReal[k] ?? 0);
    const ni = (baseImag[k] ?? 0) + (updateImag[k] ?? 0);
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

/** Advance the field using the original left-associated three-term sum.
 * Adding a pre-summed update may differ in the last floating-point bits. */
export function stepField(
  fieldReal: Float64Array,
  fieldImag: Float64Array,
  couplingField: Float64Array,
  L: number,
  neighborWeight: number,
  matrixWeight: number,
): ComplexField {
  const base = copyField(fieldReal, fieldImag);
  const nbr = neighborResidual(base.r, base.i, L);
  const N = L * L;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  let ns = 0;
  for (let k = 0; k < N; k++) {
    const pr = base.r[k] ?? 0;
    const pi = base.i[k] ?? 0;
    const nr = pr + neighborWeight * (nbr.r[k] ?? 0) + matrixWeight * ((couplingField[k] ?? 0) * pr);
    const ni = pi + neighborWeight * (nbr.i[k] ?? 0) + matrixWeight * ((couplingField[k] ?? 0) * pi);
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

/** Site power divided by mean site power plus EPS_POWER. Reads only the field. */
export function relativePowerMetric(
  fieldReal: ArrayLike<number>,
  fieldImag: ArrayLike<number>,
): { relativePower: Float64Array; maxRelativePower: number; meanPower: number } {
  const N = fieldReal.length;
  let meanPower = 0;
  for (let k = 0; k < N; k++) {
    const pr = fieldReal[k] ?? 0;
    const pi = fieldImag[k] ?? 0;
    meanPower += pr * pr + pi * pi;
  }
  meanPower /= N;
  const relativePower = new Float64Array(N);
  let maxRelativePower = 0;
  for (let k = 0; k < N; k++) {
    const pr = fieldReal[k] ?? 0;
    const pi = fieldImag[k] ?? 0;
    const ck = (pr * pr + pi * pi) / (meanPower + EPS_POWER);
    relativePower[k] = ck;
    if (ck > maxRelativePower) maxRelativePower = ck;
  }
  return { relativePower, maxRelativePower, meanPower };
}

/** Negate both components at sites strictly above the threshold.
 * Returns 1 if any site was flipped, otherwise 0. Applying twice restores the input. */
export function applyPhaseFlip(
  fieldReal: Float64Array,
  fieldImag: Float64Array,
  relativePower: Float64Array,
  threshold: number,
): number {
  let flipped = 0;
  for (let k = 0; k < relativePower.length; k++) {
    if ((relativePower[k] ?? 0) > threshold) {
      fieldReal[k] *= -1;
      fieldImag[k] *= -1;
      flipped = 1;
    }
  }
  return flipped;
}

/** Small numerical self-check of the relative-power calculation. */
export function relativePowerCheckOk(): boolean {
  const { relativePower, maxRelativePower, meanPower } = relativePowerMetric([1, 0], [0, 1]);
  const expected = 1 / (1 + EPS_POWER);
  return meanPower === 1 && relativePower[0] === expected &&
    relativePower[1] === expected && maxRelativePower === expected;
}

export class LatticeSim {
  cfg: Config;
  L: number;
  rng: SeededRng;
  matrices: Float64Array;
  /** Coordinate mapping: slot k stores site (siteI[k], siteJ[k]). */
  siteI: Int16Array;
  siteJ: Int16Array;
  fieldReal: Float64Array;
  fieldImag: Float64Array;
  couplingField: Float64Array;
  relativePower: Float64Array;
  det: Float64Array;
  tick = 0;
  last: TelemetryRow | null = null;

  constructor(cfg: Config) {
    assertSupportedDimension(cfg);
    this.cfg = { ...cfg };
    this.L = cfg.grid;
    this.rng = new SeededRng(cfg.seed);
    const alloc = this.allocate(this.L);
    this.matrices = alloc.matrices;
    this.siteI = alloc.siteI;
    this.siteJ = alloc.siteJ;
    this.fieldReal = alloc.fieldReal;
    this.fieldImag = alloc.fieldImag;
    this.couplingField = alloc.couplingField;
    this.relativePower = alloc.relativePower;
    this.det = alloc.det;
    this.initState();
  }

  private allocate(L: number) {
    const N = L * L;
    const siteI = new Int16Array(N);
    const siteJ = new Int16Array(N);
    for (let i = 0; i < L; i++) {
      for (let j = 0; j < L; j++) {
        const k = i * L + j;
        siteI[k] = i;
        siteJ[k] = j;
      }
    }
    return {
      matrices: new Float64Array(N * 3),
      siteI,
      siteJ,
      fieldReal: new Float64Array(N),
      fieldImag: new Float64Array(N),
      couplingField: new Float64Array(N),
      relativePower: new Float64Array(N),
      det: new Float64Array(N),
    };
  }

  reset(cfg?: Partial<Config>): void {
    if (cfg) this.cfg = { ...this.cfg, ...cfg };
    assertSupportedDimension(this.cfg);
    this.L = this.cfg.grid;
    this.rng = new SeededRng(this.cfg.seed);
    const alloc = this.allocate(this.L);
    this.matrices = alloc.matrices;
    this.siteI = alloc.siteI;
    this.siteJ = alloc.siteJ;
    this.fieldReal = alloc.fieldReal;
    this.fieldImag = alloc.fieldImag;
    this.couplingField = alloc.couplingField;
    this.relativePower = alloc.relativePower;
    this.det = alloc.det;
    this.tick = 0;
    this.last = null;
    this.initState();
  }

  private initState(): void {
    const { L, rng, matrices, fieldReal, fieldImag } = this;
    const N = L * L;
    for (let k = 0; k < N; k++) {
      matrices[k * 3] = 1 + 0.05 * rng.gaussian();
      matrices[k * 3 + 1] = 0.05 * rng.gaussian();
      matrices[k * 3 + 2] = 1 + 0.05 * rng.gaussian();
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      let bad = false;
      for (let k = 0; k < N; k++) {
        const a = matrices[k * 3];
        const b = matrices[k * 3 + 1];
        const c = matrices[k * 3 + 2];
        if (a * c - b * b <= 0) {
          matrices[k * 3] = Math.abs(a) + 1;
          matrices[k * 3 + 1] = 0;
          matrices[k * 3 + 2] = Math.abs(c) + 1;
          bad = true;
        }
      }
      if (!bad) break;
    }
    let ns = 0;
    for (let k = 0; k < N; k++) {
      fieldReal[k] = rng.gaussian();
      fieldImag[k] = rng.gaussian();
      ns += fieldReal[k] * fieldReal[k] + fieldImag[k] * fieldImag[k];
    }
    const inv = 1 / (Math.sqrt(ns) + EPS_NORM);
    for (let k = 0; k < N; k++) {
      fieldReal[k] *= inv;
      fieldImag[k] *= inv;
    }
    this.refreshDerived();
  }

  private refreshDerived(): void {
    const { matrices, fieldReal, fieldImag, couplingField, det } = this;
    const N = this.L * this.L;
    for (let k = 0; k < N; k++) {
      const a = matrices[k * 3];
      const b = matrices[k * 3 + 1];
      const c = matrices[k * 3 + 2];
      const d = a * c - b * b;
      det[k] = d;
      couplingField[k] = a + c + 0.1 * Math.log(Math.max(d, EPS_DET));
    }
    const { relativePower } = relativePowerMetric(fieldReal, fieldImag);
    this.relativePower.set(relativePower);
  }

  private updateMatrices(): void {
    const { matrices, rng, L } = this;
    const eps = this.cfg.matrixStepSize;
    const N = L * L;
    for (let k = 0; k < N; k++) {
      let s0 = rng.gaussian();
      const s1 = rng.gaussian();
      let s2 = rng.gaussian();
      const tr = s0 + s2;
      s0 -= 0.5 * tr;
      s2 -= 0.5 * tr;
      const a = matrices[k * 3] + eps * s0;
      const b = matrices[k * 3 + 1] + eps * s1;
      const c = matrices[k * 3 + 2] + eps * s2;
      if (a * c - b * b > 0) {
        matrices[k * 3] = a;
        matrices[k * 3 + 1] = b;
        matrices[k * 3 + 2] = c;
      }
    }
  }

  /** Normalized complex field update using the current matrix coupling. */
  private updateField(): void {
    const { fieldReal, fieldImag, couplingField, L } = this;
    const { neighborWeight, matrixWeight } = this.cfg;
    const next = stepField(fieldReal, fieldImag, couplingField, L, neighborWeight, matrixWeight);
    this.fieldReal.set(next.r);
    this.fieldImag.set(next.i);
  }

  private phaseFlipGate(): { maxRelativePower: number; phaseFlipApplied: number } {
    const { relativePower, maxRelativePower } = relativePowerMetric(this.fieldReal, this.fieldImag);
    this.relativePower.set(relativePower);
    let phaseFlipApplied = 0;
    if (this.cfg.phaseFlipEnabled) {
      phaseFlipApplied = applyPhaseFlip(this.fieldReal, this.fieldImag, relativePower, PHASE_FLIP_THRESHOLD);
    }
    return { maxRelativePower, phaseFlipApplied };
  }

  private siteMappingOk(): number {
    return siteMappingHolds(this.matrices, this.siteI, this.siteJ, this.L) ? 1 : 0;
  }

  step(): TelemetryRow {
    this.updateMatrices();
    this.refreshDerived();
    this.updateField();
    const { maxRelativePower, phaseFlipApplied } = this.phaseFlipGate();
    this.refreshDerived();

    const { fieldReal, fieldImag, det, couplingField, L } = this;
    const N = L * L;
    const nbr = neighborResidual(fieldReal, fieldImag, L);
    let state = 0;
    let residualSquaredNorm = 0;
    let detMin = Infinity;
    let pull = 0;
    for (let k = 0; k < N; k++) {
      state += fieldReal[k] * fieldReal[k] + fieldImag[k] * fieldImag[k];
      residualSquaredNorm += (nbr.r[k] ?? 0) * (nbr.r[k] ?? 0) + (nbr.i[k] ?? 0) * (nbr.i[k] ?? 0);
      if (det[k] < detMin) detMin = det[k];
      pull += couplingField[k];
    }
    const residualNorm = Math.sqrt(residualSquaredNorm);
    const row: TelemetryRow = {
      schemaVersion: TELEMETRY_SCHEMA_VERSION,
      tick: this.tick,
      stateNorm: Math.sqrt(state),
      neighborResidualNorm: residualNorm,
      minDeterminant: detMin,
      meanMatrixCoupling: pull / N,
      maxRelativePower: maxRelativePower,
      phaseFlipApplied,
      siteMappingOk: this.siteMappingOk(),
    };
    this.last = row;
    this.tick += 1;
    return row;
  }

  overThreshold(): number {
    let n = 0;
    for (let k = 0; k < this.relativePower.length; k++) {
      if (this.relativePower[k] > PHASE_FLIP_THRESHOLD) n++;
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
  if (!rows.every((r) => r.siteMappingOk === 1)) fails.push("P1 site mapping");
  if (!rows.every((r) => r.minDeterminant > 0)) fails.push("P2 determinant");
  if (symmetricComponentCount(cfg.n) !== 3) fails.push("P3 matrix components");
  if (rows.some((r) => !Number.isFinite(r.maxRelativePower))) fails.push("P4 maxRelativePower nonfinite");
  if (!relativePowerCheckOk()) fails.push("P4 relative power");
  if (!p5) fails.push("P5 deterministic");
  if (!cfg.phaseFlipEnabled && rows.some((r) => r.phaseFlipApplied !== 0)) {
    fails.push("P6 phase flip disabled");
  }
  return { ok: fails.length === 0, fails, p5 };
}

export function runChecks(
  cfg: Config,
  ticks = CHECK_TICKS,
): { rows: TelemetryRow[]; result: CheckResult } {
  const a = new LatticeSim(cfg);
  const rowsA: TelemetryRow[] = [];
  for (let i = 0; i < ticks; i++) rowsA.push(a.step());
  const b = new LatticeSim(cfg);
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
  return `telemetry_seed${cfg.seed}_ticks${ticks}_phaseflip${cfg.phaseFlipEnabled ? "on" : "off"}.csv`;
}

export function sampleAt(sim: LatticeSim, i: number, j: number) {
  const k = i * sim.L + j;
  const m11 = sim.matrices[k * 3] ?? 0;
  const m12 = sim.matrices[k * 3 + 1] ?? 0;
  const m22 = sim.matrices[k * 3 + 2] ?? 0;
  const pr = sim.fieldReal[k] ?? 0;
  const pi = sim.fieldImag[k] ?? 0;
  return {
    i,
    j,
    m11,
    m12,
    m22,
    det: sim.det[k] ?? 0,
    couplingField: sim.couplingField[k] ?? 0,
    fieldReal: pr,
    fieldImag: pi,
    mag: Math.hypot(pr, pi),
    phase: Math.atan2(pi, pr),
    relativePower: sim.relativePower[k] ?? 0,
  };
}

export type SiteSample = ReturnType<typeof sampleAt>;
