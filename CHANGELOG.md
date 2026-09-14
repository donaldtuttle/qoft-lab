# Changelog

## 0.1.1 — Typed Realization + verification

Semantic / type-boundary + verification release. **Intended dynamics changes: none.**

QOFT Lab v0.1.1 formalizes the existing n=2 GU × QOFT calculus toy as an
explicit DEVELOP Typed Realization, separates canonical QOFT constructs from
local implementation choices, corrects telemetry semantics, narrows invariant
claims to mechanically verified behavior, and adds deterministic regression /
CI verification.

### Realization

- Declare Πᴽtoy = id, Gtoy as the complex update carrier, ⊕toy = normalize(ψᴽ+γ).
- Split `qoftTick` into `piReflexToy` → `gammaToy` → `fuseToy` (`xiToy`).
- Same IEEE arithmetic as `normalize(ψ + α Γ_nbr(ψ) + β Φ_X · ψ)`.
- Canonical weight: **NONE**. No canon amendment. No GU promotion.

### Telemetry

- Rename the Γ-neighbor norm to `gammaNorm`.
- Keep `reflexNorm` as a deprecated alias of `gammaNorm` (same number).

### Collapse / intervention

- Extract `collapseMetric(ψ)` — C is structurally a function of ψ only.
- Label the × −1 gate a **phase-flip intervention**, not canonical Λψ.
- λ_c = 1.67 remains a toy/local threshold, not a QOFT universal constant.

### Invariants

- P4 wording narrowed to collapse-metric isolation (`C = f(ψ)` only).
- Banned GU identifications are model constraints, not a class-exhaustion claim.

### Verification

- `src/lib/qoft/sim.test.ts`: P1–P6, P5 replay, v0.1.0 golden telemetry pin,
  decomposed-vs-monolithic single-tick equivalence, P4 isolation, involutive
  phase flip.
- Python reference toy mirrors the decomposition and self-checks equivalence.
- `typecheck` / `test` / `check` scripts; CI on push/PR; committed lockfile
  on the public GitHub tree.

### Not in this release

- Shiab, G = H ⋉ N, spinors, U(64,64), n=4.
- License change (still MIT).
- Any intended change to numerical dynamics.
