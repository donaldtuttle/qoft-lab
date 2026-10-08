# Migration to version 0.2.0

This successor uses ordinary numerical and software terminology throughout its
application, model contract, TypeScript API, Python command line, and telemetry.
The original project's documents and release history remain at the pinned source
listed in [ORIGINS.md](../ORIGINS.md). This is a breaking API/schema migration.

## Name mapping

| Previous identifier | New identifier | Actual operation |
| --- | --- | --- |
| `QoftSim` | `LatticeSim` | Simulation state and explicit time stepping |
| `psiR`, `psiI` | `fieldReal`, `fieldImag` | Complex scalar components |
| `g` | `matrices` | Packed symmetric matrices |
| `phi` | `couplingField` | Matrix-derived scalar coupling |
| `neighborGamma` | `neighborResidual` | Four-neighbor average minus the field |
| `gammaToy` | `computeUpdate` | Weighted additive update terms |
| `fuseToy` | `addAndNormalize` | Addition followed by stabilized L2 normalization |
| `xiToy` | `stepField` | Operational update with original floating-point order |
| `piReflexToy` | `copyField` in the update path | Copy values; no self-model computation |
| `iotaAt`, `piSection` | `matrixAt`, `siteCoordinates` | Access a matrix record and its coordinates |
| `sectionLawHolds` | `siteMappingHolds` | Coordinate/storage consistency |
| `collapseMetric` | `relativePowerMetric` | Site power relative to its mean |
| `LAMBDA_C` | `PHASE_FLIP_THRESHOLD` | Local threshold, still 1.67 |
| `collapse` | `phaseFlipEnabled` | Boolean gate configuration |
| `alpha`, `beta`, `epsilonG` | `neighborWeight`, `matrixWeight`, `matrixStepSize` | Weights and perturbation scale |

Unused identity encode/decode wrappers, unused context and memory types, and
framework declaration metadata have been removed. They contributed no numerical
work. The active module is `src/lib/lattice/sim.ts`. No legacy simulation API is
silently re-exported.

## CSV migration

| Old column | Schema 2 column |
| --- | --- |
| `t` | `tick` |
| `stateNorm` | `stateNorm` |
| `gammaNbrNorm`, `gammaNorm`, `reflexNorm` | `neighborResidualNorm` |
| `det_g_min` | `minDeterminant` |
| `pullback_mean` | `meanMatrixCoupling` |
| `C_max` | `maxRelativePower` |
| `collapsed` | `phaseFlipApplied` |
| `section_law_ok` | `siteMappingOk` |
| absent | `schemaVersion = 2` |

`fromLegacyTelemetry` in `legacy-telemetry.ts` converts parsed numeric rows. It
rejects conflicting aliases and missing or nonfinite required values. It does
not infer arbitrary CSV dialects or alter archived files. The original v0.1.0
CSV fixture is retained byte for byte and verified by its SHA-256.

## Python

The download is now `public/lattice_reference.py`. Use `--phase-flip on|off`.
Python configuration uses `phase_flip`, `neighbor_weight`, `matrix_weight`, and
`matrix_step_size`. Exported columns match TypeScript schema 2. The source Python
trajectory is verified separately under the pinned NumPy version.

## Deliberate validation changes

P4 now evaluates a known relative-power example. The old source-string check for
forbidden constants has been replaced. Unit tests check the formula and input
independence. Historical P1-P6 results have not been rewritten.

The migration suite verifies all exported numeric fields and hashes the TypeScript
field arrays, matrices, derived arrays, coordinate arrays, tick, and RNG state
for 16 initial states and 1,792 ticks. Python has 1,792 matched telemetry checks.
These results concern software equivalence to a specified source, not model utility.
