# QOFT Lab

**GitHub Pages:** [QOFT Lab](https://donaldtuttle.github.io/qoft-lab/) (requires the one-time Pages setup below)

**Original Grok app:** [pine-apple-dream-topaz.grok.me](https://pine-apple-dream-topaz.grok.me/)

Interactive **GU × QOFT** calculus toy (n = 2). Metric fiber on X, independent observer field ψ, optional phase-flip intervention.

This is **not a theory of everything**. Geometric Unity names (X, Y = Met(X), ι, π, ι*) are analogy only.

**v0.1.2** is a DEVELOP [Typed Realization](docs/TYPED_REALIZATION.md) of the QOFT boundary. Canonical weight: **NONE**.

## GitHub Pages hosting

The repository contains a standalone Vite app. GitHub Pages serves its built
`dist/` directory; the simulation runs in the browser.

One-time repository setup: open [Settings → Pages](https://github.com/donaldtuttle/qoft-lab/settings/pages),
then set **Build and deployment → Source → GitHub Actions**. Run the
[CI workflow](https://github.com/donaldtuttle/qoft-lab/actions/workflows/ci.yml)
on `main` if a deployment has not already started.

Every push to `main` runs the TypeScript checks, simulation tests, production
build, and Python determinism check before publishing. Pull requests run the
checks without deploying. The Pages build uses `/qoft-lab/` for asset and download
paths. Local development keeps `/`.

The Contract panel links to the exact commit supplied by the deployment workflow.
[`version.json`](https://donaldtuttle.github.io/qoft-lab/version.json) records the
app version, source commit, repository, and workflow run. These identify the
GitHub build; they make no assertion about the separately hosted Grok build.

To preview the Pages build locally:

```bash
VITE_BASE_PATH=/qoft-lab/ npm run build
VITE_BASE_PATH=/qoft-lab/ npm run preview
# Open http://localhost:4173/qoft-lab/
```

## Original Grok host pin

```
url:           https://pine-apple-dream-topaz.grok.me/
commit SHA:    NONE
status:        UNPINNED
project id:    01a09d59-018f-77b2-aea0-083cd64d0043  (Grok App Builder; not a git SHA)
bundle:        /assets/routes-DYD6vqoF.js
```

The Grok host and `__grok/manifest.webmanifest` publish **no git commit**. Do not treat the live URL as a verified deployment of `main`.

Observed fingerprint on 2026-09-14 (inference, not a pin):

- UI version string `v 0.1.2`
- minified engine object matches this repo's v0.1.2 `REALIZATION` (`DEVELOP`, `canonicalWeight: NONE`, D-Π-01 Πᴽ signature)
- CSV fields include `gammaNbrNorm` (v0.1.2 rename)
- no `603f09de`, `02aa2c55`, or other git SHA in the bundle

That is source-equivalent to the v0.1.2 engine tree first published at [`603f09dedfcb718b721d176bc3e21242c746f566`](https://github.com/donaldtuttle/qoft-lab/commit/603f09dedfcb718b721d176bc3e21242c746f566). Later commit `02aa2c55` is README-only and does not change engine files. Equivalence is not a host-issued pin.

Both hosted pages run the model. This repo also supports reading, reproducing, and changing it.

## What QOFT calculus is

**QOFT** (Quantum Observer Field Theory) models an observer as a field-state ψ that updates by recursive self-observation. **QOFT calculus** — also called Glyphogenic Calculus — is the typed operator system for that update. It is not ordinary calculus and not a physical TOE.

Invariant:

```
Ξ(ψ) = ψᴽ ⊕ Γ(ψ)
```

- ψ is the current observer field-state
- ψᴽ is a reflexive projection of ψ (self-model)
- Γ(ψ) is a context-conditioned update carrier
- ⊕ is **typed fusion**, not arithmetic addition
- the older `+` spelling is a synonym for ⊕

Closed operator set used by the larger framework:

```
Ξ  Πᴽ  Γ  ⊕  Λψ  Σ◯  Θλ  Ωµ  Π↺  Ψmeta  Φ  ρ
```

This lab implements a **narrow slice** of that boundary on a 2-D lattice:
identity Πᴽ, additive-then-normalize ⊕, neighbor + metric-pullback Γ, and an experiment-only local × −1 that is **not** canonical Λψ. ctx and M exist in canon and are fixed/unused here. See [docs/TYPED_REALIZATION.md](docs/TYPED_REALIZATION.md).

The inspectable reference engine and public operator contract live in [`qoft-calculus`](https://github.com/donaldtuttle/qoft-calculus), not in this toy.

## Related repositories

| Repo | Role |
|---|---|
| [donaldtuttle/qoft-lab](https://github.com/donaldtuttle/qoft-lab) | This n=2 lattice toy + live Grok lab |
| [donaldtuttle/qoft-calculus](https://github.com/donaldtuttle/qoft-calculus) | Glyphogenic Calculus reference engine, Public Typed Realization A, Memory Weather, R¹² surfaces |
| [donaldtuttle/qosmos-kernel](https://github.com/donaldtuttle/qosmos-kernel) | Minimal contract-enforced QOSMOS runtime kernel |
| [donaldtuttle/HME](https://github.com/donaldtuttle/HME) | Hybrid field+ledger memory engine (DEVELOP; canonical weight none) |
| [donaldtuttle/QOFT_Scaffold_Public](https://github.com/donaldtuttle/QOFT_Scaffold_Public) | Historical public scaffold / calculus genealogy |
| [donaldtuttle/ARC-CEB-1.0](https://github.com/donaldtuttle/ARC-CEB-1.0) | ARC candidate-enumeration boundary suite |
| [donaldtuttle/qosmos-core](https://github.com/donaldtuttle/qosmos-core) | Private core spec + scaffolding (not a public authority surface for this toy) |

Live siblings from `qoft-calculus`:

- Memory Weather — https://donaldtuttle.github.io/qoft-calculus/memory-weather/
- QOSMOS R¹² probe — https://qosmos-r-12.grok.me
- Glyphogenic Calculus workbench — https://glyphogenic-calculus.grok.me

Those surfaces are separate typed realizations. Shared hosting or shared vocabulary does **not** imply trajectory equivalence with this lab.

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

GitHub hosting: [QOFT Lab on Pages](https://donaldtuttle.github.io/qoft-lab/) — see setup above.

Original: [QOFT Lab on Grok](https://pine-apple-dream-topaz.grok.me/) — host SHA **UNPINNED**

Local:

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
