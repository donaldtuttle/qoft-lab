# Typed Realization Registry — QOFT Lab n=2 toy

**Status:** DEVELOP  
**Kind:** Typed Realization of the QOFT boundary  
**Canonical weight:** NONE  
**Lab version:** 0.1.2  

This document follows the project Typed Realization Registry discipline:
canonical target → runtime implementation → implementation type → omitted
behavior → supported claim. It does not amend canon.

## Classification

| Item | This toy |
|---|---|
| GU terms (X, Y = Met(X), ι, π, ι*) | analogy only |
| QOFT code | DEVELOP Typed Realization |
| Phase flip (× −1) | experiment-only intervention |
| Canonical weight | NONE |

Not a theory of everything. Not a canon amendment. Not a promotion of GU
machinery into the dynamics.

## Canonical boundary

Canon (D-Π-01) pins

```
Πᴽ : Ψ × Ctx × M → Ψᴽ
Γ  ∈ G
⊕  : Ψᴽ × G → Ψ
Ξ(ψ) = Πᴽ(ψ; ctx, M) ⊕ Γ(ψ; ctx)
```

The realization may choose concrete representations, fix unused arguments,
and pick internal arithmetic. Fixing an argument is a **realization bridge**,
not a change to the canonical target.

## This toy

```
Ψtoy              := normalized complex scalar fields over the L×L lattice
Ψᴽtoy             := Ψtoy
encode_A          := id  : Ψtoy → Ψtoy
decode_B          := id  : Ψtoy → Ψtoy
ctx_toy           := (g, α, β, L)          # realizes Ctx
M_toy             := unused / absent       # M is fixed, not deleted from canon
Πᴽtoy(ψ; ctx, M)  := ψ                     # Πᴽtoy : Ψtoy → Ψtoy
Gtoy              := complex lattice update fields
Γtoy(ψ; g)        := α · (neighbor_average(ψ) − ψ) + β · Φ_X(g) ⊙ ψ
⊕toy(ψᴽ, γ)       := normalize(ψᴽ + γ)
Ξtoy(ψ; g)        := Πᴽtoy(ψ) ⊕toy Γtoy(ψ; g)
```

Πᴽtoy is an **intentionally trivial identity self-model**. Canonical Πᴽ still
takes (ψ, ctx, M); this realization does not read ctx or M. Equality
Ψᴽtoy = Ψtoy is compatible with the canonical subspace relationship for this
particular realization.

Internal addition belongs inside ⊕toy. The formula

```
ψ ← normalize(ψ + α Γ_nbr(ψ) + β Φ_X · ψ)
```

is the rendered IEEE arithmetic of Ξtoy (left-associated three-term sum),
identical to v0.1.0.

## Meaning of ≈

| Path | Relation | Meaning |
|---|---|---|
| Operational IEEE tick `xiToy` | **exact equality** | bit-identical to the v0.1.0 monolithic three-term sum on the same inputs |
| Abstract `fuseToy(Πᴽtoy(ψ), Γtoy(ψ))` | **bounded approximation** | componentwise `\|·\| < 1e-15` vs the IEEE tick (FP `+` is not associative) |
| `encode_A` / `decode_B` | **exact equality** | identity; `decode_B ∘ encode_A = id` on Ψtoy |
| JS vs Python telemetry | **not claimed** | different RNGs (sfc32 vs numpy PCG64); same tick contract |

## Crosswalk

| Canonical target | Runtime implementation | Implementation type | Omitted behavior | Supported claim |
|---|---|---|---|---|
| Ξ(ψ) = Πᴽ(ψ; ctx, M) ⊕ Γ(ψ; ctx) | `xiToy` IEEE path | exact vs v0.1.0 | nontrivial Πᴽ, Shiab, spinors, n=4 | this toy implements the boundary as identity-Πᴽ + additive-⊕ |
| Πᴽ : Ψ × Ctx × M → Ψᴽ | `piReflexToy(ψ)` | identity; ctx, M unused | nontrivial reflexive self-model; ctx/M dependence | Πᴽtoy is declared identity. Canon is not rewritten. |
| Ctx | `(g, α, β, L)` | metric fiber + couplings + lattice | other context channels | ctx_toy is this 4-tuple |
| M | unused / absent | fixed | any M-dependence | omission is a bridge, not a canon edit |
| encode_A, decode_B | `encodeA` / `decodeB` | identity | nontrivial representation change | Ψtoy is the carrier |
| Γ ∈ G | `gammaToy` | neighbor difference + pullback coupling | Shiab, G = H ⋉ N | Γtoy is a lattice update carrier |
| ⊕ : Ψᴽ × G → Ψ | `fuseToy` = N(ψᴽ+γ) | additive then L2 normalize | other fusion algebras | internal addition lives inside ⊕toy |
| Λψ | `phaseFlipIntervention` | local × −1 on C > λ_c | projection-like commitment, irreversibility | **not** a realization of canonical Λψ |
| C | `collapseMetric(ψ)` | \|ψ\|² / (ρ+ε) | dependence on g, 14, dim(Y), Shiab | C is isolated to ψ |
| λ_c | 1.67 | toy / local threshold | QOFT universal constant | implementation parameter |

## Mechanically checked (P1–P6)

| | Check | What it actually tests |
|---|---|---|
| P1 | section law | `π(ι(x)) = x` at every site, unique coverage of X, fiber present at the paired slot. Site coordinates are stored in the section pairing (`siteI`, `siteJ`). A permuted pairing fails. |
| P2 | det g > 0 | rejected metric updates leave the SPD cone |
| P3 | fiber = 3 | n=2 symmetric bilinear forms have 3 independent components |
| P4 | collapse-metric isolation | C = f(ψ) only; λ_c ≠ 14; `collapseMetric` arity is ψ only |
| P5 | deterministic | same seed + config ⇒ identical telemetry |
| P6 | phase-flip off | when the gate is off, `collapsed` stays 0 |

P4 does **not** enumerate every banned identification (Y = ψ, G = Y,
retrieve-as-ID, Shiab in C). Those remain **model constraints**, enforced
by construction and review, not by a class-exhaustion enumerator.

## Telemetry

`gammaNbrNorm` is ‖neighbor_avg(ψ) − ψ‖ after the tick. That is **Γ_nbr**,
not the full Γtoy carrier `α Γ_nbr + β Φ_X ⊙ ψ`. The chart labels it ‖Γnbr‖.

`gammaNorm` and `reflexNorm` are deprecated aliases of `gammaNbrNorm` so
older CSVs still parse.

## Golden fixture

`src/lib/qoft/fixtures/v0.1.0-toy-seed7.csv` is a **golden fixture** (regression
artifact), not a third-party forensic pin.

| | |
|---|---|
| Source commit | `c344023c8d7e7d0939f3513d617e24c17fddb2fe` (v0.1.0 engine) |
| Config | V0: seed 7, grid 8, collapse off, 32 ticks |
| SHA-256 | `8b9ddbaed92ac9818fc46a219e1a256393eee77468e7b3b9b79656ade2620f53` |

See `src/lib/qoft/fixtures/PROVENANCE.md`. Tests hash the file and compare
telemetry fields against it.

## What this does not claim

- Canonical Λψ has been realized.
- Πᴽ is nontrivial, or that ctx/M have been dropped from canon.
- GU geometry (Shiab, G = H ⋉ N, spinors, U(64,64), n=4) is present.
- λ_c = 1.67 is a QOFT universal constant.
- Bit-identity with the numpy PCG64 original (different RNG; same contract).
- `gammaNbrNorm` is ‖Γtoy‖.

Intended numerical dynamics relative to v0.1.0 / v0.1.1: **none**.
