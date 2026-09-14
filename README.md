# QOFT Lab

Interactive **GU × QOFT** calculus toy (n = 2). Metric fiber on X, independent observer field ψ, optional collapse gate.

This is **not a theory of everything**. Geometric Unity names (X, Y = Met(X), ι, π, ι*) are analogy only.

## Tick contract

Each tick, in order:

1. **Metric step** on ι = g: `g ← g + ε σ` with σ a symmetric 2-tensor (mild traceless bias). Reject any site with det ≤ 0.
2. **Pullback:** `Φ_X = Φ_Y(x, g_t(x)) = tr(g) + 0.1 log det(g)`
3. **QOFT tick on ψ only:** `ψ ← normalize(ψ + α Γ(ψ) + β Φ_X · ψ)`  
   Γ is a four-neighbor average minus ψ — a typed fusion stand-in, **not Shiab**.
4. **Optional collapse on ψ:** `C = |ψ|² / (ρ + ε)`. If `C > λ_c = 1.67`, local phase flip (× −1). The gate does not see dim(Y), 14, or Shiab.

## Invariants P1–P6

| | Check |
|---|---|
| P1 | Section law: π ∘ ι = id (g stored at each site x) |
| P2 | det g > 0 (Riemannian; rejected updates leave the SPD cone) |
| P3 | Fiber = 3 (independent components of symmetric bilinear forms on R²) |
| P4 | C independent of 14 / dim(Y) / Shiab |
| P5 | Same seed + config ⇒ identical telemetry |
| P6 | Collapse off ⇒ `collapsed` stays 0 |

**Banned identifications:** Y = ψ · Shiab in C · literal 14 in C · G = Y · retrieve-as-ID.

**Out of scope:** Shiab, G = H ⋉ N, spinors, U(64,64), n = 4.

## Run

```bash
npm install
npm run dev
```

Then open the URL Vite prints. **Toy run · 32 ticks** executes the same contract as the original Python and prints `PASS` / `FAIL` for P1–P6.

The in-browser engine is seeded and deterministic with itself (P5). It is **not** bit-identical to numpy PCG64.

## Layout

| Path | What |
|---|---|
| [`src/lib/qoft/sim.ts`](src/lib/qoft/sim.ts) | Tick engine, telemetry, P1–P6 |
| [`src/stores/lab-store.ts`](src/stores/lab-store.ts) | Playback, config, CSV export |
| [`src/components/lab/`](src/components/lab/) | Field canvas, controls, charts, contract |
| [`public/gu_qoft_toy.py`](public/gu_qoft_toy.py) | Original Python toy |

## License

MIT. The original Python toy is included as the spec for the tick contract.
