# Numerical model

## Scope and data

This implementation is a discrete dynamical system on a square grid with periodic
boundaries. It is implemented with ordinary arrays, a pseudorandom generator,
a four-neighbor stencil, and explicit time stepping.

For a grid of side length `L`, the TypeScript state contains:

| Array | Shape | Meaning |
| --- | --- | --- |
| `fieldReal`, `fieldImag` | `L * L` each | Complex scalar at every site |
| `matrices` | `3 * L * L` | Packed symmetric matrix components `m11, m12, m22` |
| `siteI`, `siteJ` | `L * L` each | Stored row and column coordinates |
| `couplingField` | `L * L` | Scalar derived from each matrix |
| `relativePower` | `L * L` | Site power divided by stabilized mean power |
| `det` | `L * L` | Matrix determinants |

The generator state and tick counter are also part of the numerical trajectory.
The field and matrix arrays are separate. There is no learned model, attention
mechanism, memory retrieval system, or adaptive policy in this implementation.

## Each tick

1. Sample three Gaussian values per site, subtract half their diagonal sum from
   both diagonal perturbations, and scale by `matrixStepSize`. This makes the
   perturbation traceless. Accept a candidate only when its determinant is positive.
2. Compute matrix coupling from the accepted matrix:

   ```text
   determinant = m11 * m22 - m12 * m12
   coupling = m11 + m22 + 0.1 * log(max(determinant, 1e-12))
   ```

3. Compute the complex field update:

   ```text
   residual = 0.25 * (up + down + left + right) - field
   candidate = (field + neighborWeight * residual)
               + matrixWeight * (coupling * field)
   next = candidate / (global_L2_norm(candidate) + 1e-12)
   ```

   The parentheses identify the operational addition order. Pre-summing both
   update terms changes floating-point rounding. `stepField` preserves the
   original order; `computeUpdate` plus `addAndNormalize` is a separate helper
   composition checked within `1e-15` on the documented test inputs.

4. Compute `power = real*real + imag*imag` and
   `relativePower = power / (mean(power) + 1e-12)`. When the gate is enabled,
   multiply both components by `-1` wherever relative power is strictly greater
   than `1.67`. This is a local phase rotation by half a turn. It preserves power
   and is its own inverse when applied twice with the same mask.
5. Refresh derived arrays and emit telemetry after the intervention.

`1.67` is an inherited configurable-in-code threshold. It has not been calibrated
against an external task. Normalization is global, with a stabilizer, so a nonzero
field's norm is close to one rather than mathematically equal to one. The zero
field remains zero.

The matrix acceptance test checks the determinant. Positive determinant alone
is not a general positive-definiteness test for arbitrary externally supplied
matrices. Ordinary runs start near the identity and use traceless perturbations.
The public arrays are mutable; callers that replace them take responsibility
for their validity. This migration does not broaden the original input domain.

## Configuration

| Parameter | Reference value | Meaning |
| --- | --- | --- |
| `seed` | 7 | Generator seed |
| `n` | 2 | Supported spatial dimension |
| `grid` | 8 | Reference grid side; interactive default is 16 |
| `neighborWeight` | 0.15 | Weight of the neighbor residual |
| `matrixWeight` | 0.05 | Weight of pointwise matrix coupling |
| `matrixStepSize` | 0.02 | Scale of the matrix perturbations |
| `phaseFlipEnabled` | false | Enable the phase intervention |

The UI permits grids 8, 16, 24, and 32, seeds 1 through 99, neighbor weights
0 through 0.5, matrix weights 0 through 0.2, and matrix step sizes 0 through 0.08.
The numerical API retains the source implementation's narrow validation, which
rejects unsupported `n` but does not comprehensively validate arbitrary inputs.

## Checks and their limits

| Check | What it checks |
| --- | --- |
| P1 | Stored coordinates match their slots, with unique grid coverage |
| P2 | Emitted minimum determinant is positive |
| P3 | A symmetric 2x2 matrix has three stored components |
| P4 | Finite peak relative power plus a numerical formula self-check |
| P5 | Two fresh runs with the same seed and fixed configuration emit equal telemetry |
| P6 | With the phase gate disabled, the event flag is always zero |

The TypeScript mapping check also rejects nonfinite matrix components; the Python
mapping check retains the original coordinate-only behavior. Unit tests separately
exercise the relative-power formula, matrix independence, stencil boundaries,
phase reversibility, schema conversion, and full-state migration parity.
P1-P6 are not a scientific evaluation or an exhaustive input validator. They assume
a nonempty, valid simulation run. The disabled-gate check is conditional when the
gate is on; passing it does not prove that an enabled gate activated.

## Telemetry schema 2

| Field | Definition |
| --- | --- |
| `schemaVersion` | Always 2 |
| `tick` | Zero-based index of the completed update |
| `stateNorm` | Global L2 norm after the intervention |
| `neighborResidualNorm` | L2 norm of neighbor-average minus field, after the intervention |
| `minDeterminant` | Minimum matrix determinant across the grid |
| `meanMatrixCoupling` | Mean of the trace/log-determinant scalar |
| `maxRelativePower` | Largest site power ratio |
| `phaseFlipApplied` | Binary flag: at least one site flipped during this tick |
| `siteMappingOk` | 1 when the coordinate mapping check passes; otherwise 0 |

The event flag is not a count of flipped sites. The UI's **Above threshold** value
counts qualifying sites independently. The neighbor residual is not the full
weighted update. CSV exports include at most the last 256 rows retained by the UI.
They contain telemetry only, not the configuration history or full state, so a CSV
alone is not a replay artifact. Record the seed, settings, runtime, and source commit.

## Reproducibility and a useful next experiment

Use fixed settings, reset before each run, and compare matched seeds. Record exact
software versions. TypeScript uses sfc32 plus a Gaussian transform; NumPy uses
PCG64 and its own normal sampler. Cross-language bit identity is not claimed.
The regression fixtures demonstrate equality on their specified runtimes and inputs,
not on every possible machine or configuration.

A controlled study could compare the phase gate against its disabled counterpart,
then ablate neighbor coupling and matrix coupling separately. Define an external
objective, baseline, held-out seeds, and decision threshold before looking at
outcomes. A visually striking pattern or a passing unit test does not establish
that the intervention improves that objective. No such performance study was run
as part of this migration.
