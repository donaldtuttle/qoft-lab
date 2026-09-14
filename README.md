# QOFT Lab

Interactive **GU × QOFT** calculus toy (n = 2). Metric fiber on X, independent observer field ψ, optional phase-flip intervention.

This is **not a theory of everything**. Geometric Unity names (X, Y = Met(X), ι, π, ι*) are analogy only.

**v0.1.2** is a DEVELOP [Typed Realization](docs/TYPED_REALIZATION.md) of the QOFT boundary. Canonical weight: **NONE**.

## Realization boundary

Canon (D-Π-01):

```
Πᴽ : Ψ × Ctx × M → Ψᴽ
Ξ(ψ) = Πᴽ(ψ; ctx, M) ⊕ Γ(ψ; ctx)
```

This toy (ctx and M are **fixed/unused**, not deleted from canon):

```
Ψtoy              := normalized complex scalar fields on the L×L lattice
Ψᴽtoy             := Ψtoy
encode_A          := id
decode_B          := id
ctx_toy           := (g, α, β, L)
M_toy             := unused / absent
Πᴽtoy(ψ; ctx, M)  := ψ                         # Πᴽtoy : Ψtoy → Ψtoy
Gtoy              := complex lattice update fields
Γtoy(ψ; g)        := α · (neighbor_average(ψ) − ψ) + β · Φ_X(g) ⊙ ψ
⊕toy(ψᴽ, γ)       := normalize(ψᴽ + γ)
Ξtoy(ψ; g)        := Πᴽtoy(ψ) ⊕toy Γtoy(ψ; g)
```

`≈` for the operational IEEE tick is **exact equality** vs v0.1.0. `≈` for abstract `fuseToy(Π, Γtoy)` is a **bounded 1e-15** approximation (floating-point `+` is not associative).

Πᴽtoy is intentionally the identity — the toy does not contain a nontrivial reflexive self-model. Internal addition belongs inside ⊕toy. The IEEE tick is the original left-associated three-term sum `N(ψ + α Γ_nbr(ψ) + β Φ_X ⊙ ψ)` so v0.1.0 numerical dynamics are unchanged.

The local × −1 phase flip is an **experiment-only intervention**. It preserves |ψ|², is reversible, and is **not** evidence that canonical Λψ has been realized. λ_c = 1.67 is a toy/local threshold, not a QOFT universal constant.

## Tick contract

Each tick, in order:

1. **Metric step** on ι = g: `g ← g + ε σ` with σ a symmetric 2-tensor (mild traceless bias). Reject any site with det ≤ 0.
2. **Pullback:** `Φ_X = Φ_Y(x, g_t(x)) = tr(g) + 0.1 log det(g)`
3. **QOFT tick on ψ only:** `ψ ← Ξtoy(ψ; g)`
4. **Optional phase-flip on ψ:** `C = collapseMetric(ψ) = |ψ|² / (ρ + ε)`. If `C > λ_c = 1.67`, local × −1. The metric does not see dim(Y), 14, or Shiab.

## Invariants P1–P6

| | Check | What it actually tests |
|---|---|---|
| P1 | Section law | `π(ι(x)) = x` at every site against stored section coordinates. A permuted pairing fails. |
| P2 | det g > 0 | Riemannian; rejected updates leave the SPD cone |
| P3 | Fiber = 3 | Independent components of symmetric bilinear forms on R² |
| P4 | Collapse-metric isolation | C = f(ψ) only; λ_c ≠ 14. **Not** an enumerator of every banned id |
| P5 | Deterministic | Same seed + config ⇒ identical telemetry |
| P6 | Phase-flip off | When the gate is off, `collapsed` stays 0 |

**Model constraints** (by construction, not a class-exhaustion check): Y = ψ · Shiab in C · literal 14 in C · G = Y · retrieve-as-ID.

**Out of scope:** Shiab, G = H ⋉ N, spinors, U(64,64), n = 4.

Telemetry: `gammaNbrNorm` is ‖neighbor_avg(ψ) − ψ‖ after the tick (**Γ_nbr**, not full Γtoy). `gammaNorm` / `reflexNorm` are deprecated aliases of the same number.

## Run

```bash
npm ci
npm run dev
```

Then open the URL Vite prints. **Toy run · 32 ticks** executes the contract and prints `PASS` / `FAIL` for P1–P6.

```bash
npm run check          # typecheck + test + build
python public/gu_qoft_toy.py --check-deterministic
```

The in-browser engine is seeded and deterministic with itself (P5). It is **not** bit-identical to numpy PCG64.

## Layout

| Path | What |
|---|---|
| [`src/lib/qoft/sim.ts`](src/lib/qoft/sim.ts) | Tick engine, Ξtoy, telemetry, P1–P6 |
| [`src/lib/qoft/sim.test.ts`](src/lib/qoft/sim.test.ts) | Regression + golden v0.1.0 fixture |
| [`docs/TYPED_REALIZATION.md`](docs/TYPED_REALIZATION.md) | Canonical → runtime crosswalk |
| [`src/stores/lab-store.ts`](src/stores/lab-store.ts) | Playback, config, CSV export |
| [`src/components/lab/`](src/components/lab/) | Field canvas, controls, charts, contract |
| [`public/gu_qoft_toy.py`](public/gu_qoft_toy.py) | Reference Python toy |
| [`requirements-ci.txt`](requirements-ci.txt) | Pinned NumPy for CI |

## License

MIT. The original Python toy is included as the spec for the tick contract.
