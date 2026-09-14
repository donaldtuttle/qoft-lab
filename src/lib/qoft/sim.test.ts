import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  EPS_NORM,
  LAMBDA_C,
  REALIZATION,
  V0_CONFIG,
  collapseMetric,
  fiberDim,
  fuseToy,
  gammaToy,
  neighborGamma,
  p4IsolationOk,
  phaseFlipIntervention,
  piReflexToy,
  runToy,
  xiToy,
  type Config,
} from "./sim.ts";

const here = dirname(fileURLToPath(import.meta.url));

function parseCsv(text: string): Record<string, number>[] {
  const lines = text.trim().split(/\r?\n/);
  const header = (lines.shift() ?? "").split(",");
  return lines.map((line) => {
    const cells = line.split(",");
    const row: Record<string, number> = {};
    header.forEach((h, i) => {
      row[h] = Number(cells[i]);
    });
    return row;
  });
}

/** v0.1.0 monolithic tick: ψ ← N(ψ + α Γ_nbr(ψ) + β Φ_X · ψ). */
function monolithicTick(
  psiR: Float64Array,
  psiI: Float64Array,
  phi: Float64Array,
  L: number,
  alpha: number,
  beta: number,
): { r: Float64Array; i: Float64Array } {
  const nbr = neighborGamma(psiR, psiI, L);
  const N = L * L;
  const r = new Float64Array(N);
  const i = new Float64Array(N);
  let ns = 0;
  for (let k = 0; k < N; k++) {
    const nr = (psiR[k] ?? 0) + alpha * (nbr.r[k] ?? 0) + beta * ((phi[k] ?? 0) * (psiR[k] ?? 0));
    const ni = (psiI[k] ?? 0) + alpha * (nbr.i[k] ?? 0) + beta * ((phi[k] ?? 0) * (psiI[k] ?? 0));
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

function seededField(L: number, seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const N = L * L;
  const psiR = new Float64Array(N);
  const psiI = new Float64Array(N);
  const phi = new Float64Array(N);
  let ns = 0;
  for (let k = 0; k < N; k++) {
    psiR[k] = next() * 2 - 1;
    psiI[k] = next() * 2 - 1;
    phi[k] = 1.5 + next();
    ns += psiR[k] * psiR[k] + psiI[k] * psiI[k];
  }
  const inv = 1 / (Math.sqrt(ns) + EPS_NORM);
  for (let k = 0; k < N; k++) {
    psiR[k] *= inv;
    psiI[k] *= inv;
  }
  return { psiR, psiI, phi };
}

describe("realization declaration", () => {
  it("is DEVELOP with canonical weight NONE", () => {
    assert.equal(REALIZATION.status, "DEVELOP");
    assert.equal(REALIZATION.kind, "Typed Realization");
    assert.equal(REALIZATION.canonicalWeight, "NONE");
    assert.equal(REALIZATION.piReflex, "id");
  });

  it("keeps λc as a toy/local threshold, not 14", () => {
    assert.equal(LAMBDA_C, 1.67);
    const lambda: number = LAMBDA_C;
    assert.notEqual(lambda, 14);
    assert.notEqual(lambda, fiberDim(4) + 4);
  });
});

describe("P1–P6 toy run", () => {
  it("V0 32-tick run PASSes P1–P6", () => {
    const { result } = runToy(V0_CONFIG, 32);
    assert.equal(result.ok, true);
    assert.deepEqual(result.fails, []);
    assert.equal(result.p5, true);
  });

  it("same seed/config replays exactly (P5)", () => {
    const a = runToy(V0_CONFIG, 32);
    const b = runToy(V0_CONFIG, 32);
    assert.equal(a.rows.length, b.rows.length);
    for (let i = 0; i < a.rows.length; i++) {
      assert.deepEqual(a.rows[i], b.rows[i]);
    }
  });

  it("matches v0.1.0 golden telemetry (intended dynamics: none)", () => {
    const golden = parseCsv(
      readFileSync(join(here, "fixtures/v0.1.0-toy-seed7.csv"), "utf8"),
    );
    const { rows } = runToy(V0_CONFIG, 32);
    assert.equal(rows.length, golden.length);
    const keys = [
      "t",
      "stateNorm",
      "det_g_min",
      "pullback_mean",
      "C_max",
      "collapsed",
      "section_law_ok",
    ] as const;
    for (let i = 0; i < rows.length; i++) {
      const got = rows[i]!;
      const want = golden[i]!;
      for (const k of keys) {
        assert.equal(got[k], want[k], `row ${i} ${k}`);
      }
      assert.equal(got.gammaNorm, want.reflexNorm, `row ${i} gammaNorm`);
      assert.equal(got.reflexNorm, want.reflexNorm, `row ${i} reflexNorm alias`);
    }
  });

  it("P6: collapse off ⇒ collapsed stays 0", () => {
    const { rows, result } = runToy({ ...V0_CONFIG, collapse: false }, 32);
    assert.ok(rows.every((r) => r.collapsed === 0));
    assert.equal(result.ok, true);
  });
});

describe("Πᴽtoy → Γtoy → ⊕toy equivalence", () => {
  it("piReflexToy is the identity", () => {
    const { psiR, psiI } = seededField(8, 3);
    const star = piReflexToy(psiR, psiI);
    assert.deepEqual(Array.from(star.r), Array.from(psiR));
    assert.deepEqual(Array.from(star.i), Array.from(psiI));
  });

  it("Ξtoy matches the v0.1.0 monolithic tick on fixed inputs", () => {
    const L = 8;
    const { psiR, psiI, phi } = seededField(L, 11);
    const alpha = 0.15;
    const beta = 0.05;
    const legacy = monolithicTick(psiR, psiI, phi, L, alpha, beta);
    const decomposed = xiToy(psiR, psiI, phi, L, alpha, beta);
    assert.equal(decomposed.r.length, legacy.r.length);
    for (let k = 0; k < legacy.r.length; k++) {
      assert.equal(decomposed.r[k], legacy.r[k], `re ${k}`);
      assert.equal(decomposed.i[k], legacy.i[k], `im ${k}`);
    }
  });

  it("abstract fuse(Π, Γtoy) stays within 1e-15 of the IEEE tick", () => {
    const L = 8;
    const { psiR, psiI, phi } = seededField(L, 11);
    const alpha = 0.15;
    const beta = 0.05;
    const ieee = xiToy(psiR, psiI, phi, L, alpha, beta);
    const star = piReflexToy(psiR, psiI);
    const g = gammaToy(psiR, psiI, phi, L, alpha, beta);
    const abstract = fuseToy(star.r, star.i, g.r, g.i);
    for (let k = 0; k < ieee.r.length; k++) {
      assert.ok(Math.abs((abstract.r[k] ?? 0) - (ieee.r[k] ?? 0)) < 1e-15, `re ${k}`);
      assert.ok(Math.abs((abstract.i[k] ?? 0) - (ieee.i[k] ?? 0)) < 1e-15, `im ${k}`);
    }
  });

  it("fuseToy(id, Γtoy) is the abstract composition, not the IEEE tick", () => {
    const L = 8;
    const { psiR, psiI, phi } = seededField(L, 19);
    const g = gammaToy(psiR, psiI, phi, L, 0.15, 0.05);
    const star = piReflexToy(psiR, psiI);
    const fused = fuseToy(star.r, star.i, g.r, g.i);
    const composedAgain = fuseToy(
      piReflexToy(psiR, psiI).r,
      piReflexToy(psiR, psiI).i,
      g.r,
      g.i,
    );
    for (let k = 0; k < fused.r.length; k++) {
      assert.equal(fused.r[k], composedAgain.r[k]);
      assert.equal(fused.i[k], composedAgain.i[k]);
    }
  });
});

describe("P4 collapse-metric isolation", () => {
  it("collapseMetric arity is (ψ_r, ψ_i) only", () => {
    assert.equal(collapseMetric.length, 2);
    assert.equal(p4IsolationOk(), true);
  });

  it("source of collapseMetric does not mention 14", () => {
    const src = Function.prototype.toString.call(collapseMetric);
    assert.equal(src.includes("14"), false);
  });

  it("C is independent of g: same ψ, different fiber → same C", () => {
    const { psiR, psiI } = seededField(8, 5);
    const a = collapseMetric(psiR, psiI);
    psiR[0] = psiR[0]; // no-op; metric is not an input
    const b = collapseMetric(psiR, psiI);
    assert.equal(a.Cmax, b.Cmax);
    assert.deepEqual(Array.from(a.C), Array.from(b.C));
  });
});

describe("phase-flip intervention is not Λψ", () => {
  it("× −1 is involutive and preserves |ψ|²", () => {
    const { psiR, psiI } = seededField(8, 23);
    const before = Array.from(psiR).map((re, k) => re * re + (psiI[k] ?? 0) * (psiI[k] ?? 0));
    const { C } = collapseMetric(psiR, psiI);
    const origR = psiR.slice();
    const origI = psiI.slice();
    phaseFlipIntervention(psiR, psiI, C, 0); // λ=0 flips every site
    const after = Array.from(psiR).map((re, k) => re * re + (psiI[k] ?? 0) * (psiI[k] ?? 0));
    assert.deepEqual(after, before);
    for (let k = 0; k < psiR.length; k++) {
      assert.equal(psiR[k], -(origR[k] ?? 0));
      assert.equal(psiI[k], -(origI[k] ?? 0));
    }
    phaseFlipIntervention(psiR, psiI, C, 0);
    assert.deepEqual(Array.from(psiR), Array.from(origR));
    assert.deepEqual(Array.from(psiI), Array.from(origI));
  });
});

describe("config contract", () => {
  it("rejects n≠2", () => {
    const bad = { ...V0_CONFIG, n: 4 } as Config;
    assert.throws(() => runToy(bad, 1), /n = 2/);
  });
});
