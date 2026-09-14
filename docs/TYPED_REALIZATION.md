# Typed Realization Registry — QOFT Lab n=2 toy

**Status:** DEVELOP  
**Kind:** Typed Realization of the QOFT boundary  
**Canonical weight:** NONE  
**Lab version:** 0.1.1  

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

Canon fixes ψᴽ ∈ Ψᴽ ⊆ Ψ, Γ ∈ G, and ⊕ : Ψᴽ × G → Ψ, with

```
Ξ(ψ) = ψᴽ ⊕ Γ(ψ; ctx)     where ψᴽ = Πᴽ(ψ)
```

The realization may choose concrete representations and internal arithmetic.

## This toy

```
Ψtoy       := normalized complex scalar fields over the L×L lattice
Ψᴽtoy      := Ψtoy
Πᴽtoy(ψ)   := ψ
Gtoy       := complex lattice update fields
Γtoy(ψ; g) := α · (neighbor_average(ψ) − ψ) + β · Φ_X(g) ⊙ ψ
⊕toy(ψᴽ, γ):= normalize(ψᴽ + γ)
Ξtoy(ψ; g) := Πᴽtoy(ψ) ⊕toy Γtoy(ψ; g)
```

Πᴽtoy is an **intentionally trivial identity self-model**. Equality
Ψᴽtoy = Ψtoy is compatible with the canonical subspace relationship for this
particular realization. This is scientifically cleaner than pretending the
toy already contains a nontrivial reflexive model.

Internal addition belongs inside ⊕toy. The formula

```
ψ ← normalize(ψ + α Γ_nbr(ψ) + β Φ_X · ψ)
```

is the rendered IEEE arithmetic of Ξtoy (left-associated three-term sum),
identical to v0.1.0. The abstract composition `fuseToy(Πᴽtoy(ψ), Γtoy(ψ))`
may differ by ulps because floating-point `+` is not associative. The tick
uses the three-term form so intended dynamics are unchanged.

## Crosswalk

| Canonical target | Runtime implementation | Implementation type | Omitted behavior | Supported claim |
|---|---|---|---|---|
| Ξ(ψ) = ψᴽ ⊕ Γ(ψ; ctx) | `xiToy` / `xi_toy` | exact arithmetic of this toy | nontrivial Πᴽ, Shiab, spinors, n=4 | this toy implements the boundary as identity-Πᴽ + additive-⊕ |
| Πᴽ : Ψ → Ψᴽ | `piReflexToy` = id | identity | nontrivial reflexive self-model | Πᴽtoy is declared identity, not a hidden self-model |
| Γ ∈ G | `gammaToy` | neighbor difference + pullback coupling | Shiab, G = H ⋉ N | Γtoy is a lattice update carrier |
| ⊕ : Ψᴽ × G → Ψ | `fuseToy` = N(ψᴽ+γ) | additive then L2 normalize | other fusion algebras | internal addition lives inside ⊕toy |
| Λψ | `phaseFlipIntervention` | local × −1 on C > λ_c | projection-like commitment, irreversibility | **not** a realization of canonical Λψ |
| C | `collapseMetric(ψ)` | \|ψ\|² / (ρ+ε) | dependence on g, 14, dim(Y), Shiab | C is isolated to ψ |
| λ_c | 1.67 | toy / local threshold | QOFT universal constant | implementation parameter |

## Mechanically checked (P1–P6)

| | Check | What it actually tests |
|---|---|---|
| P1 | section law | g is stored at each site x (π ∘ ι = id in this discrete toy) |
| P2 | det g > 0 | rejected metric updates leave the SPD cone |
| P3 | fiber = 3 | n=2 symmetric bilinear forms have 3 independent components |
| P4 | collapse-metric isolation | C = f(ψ) only; λ_c ≠ 14; `collapseMetric` arity is ψ only |
| P5 | deterministic | same seed + config ⇒ identical telemetry |
| P6 | phase-flip off | when the gate is off, `collapsed` stays 0 |

P4 does **not** enumerate every banned identification (Y = ψ, G = Y,
retrieve-as-ID, Shiab in C). Those remain **model constraints**, enforced
by construction and review, not by a class-exhaustion enumerator.

## Telemetry

`gammaNorm` is ‖neighbor_avg(ψ) − ψ‖ after the tick. It is a Γ-neighbor
norm, not a reflexive/self-model norm. `reflexNorm` is a deprecated alias
of `gammaNorm` so v0.1.0 CSVs and scripts still parse.

## What this does not claim

- Canonical Λψ has been realized.
- Πᴽ is nontrivial.
- GU geometry (Shiab, G = H ⋉ N, spinors, U(64,64), n=4) is present.
- λ_c = 1.67 is a QOFT universal constant.
- Bit-identity with the numpy PCG64 original (different RNG; same contract).

Intended numerical dynamics relative to v0.1.0: **none**.
