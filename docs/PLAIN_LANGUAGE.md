# Lattice Dynamics Lab

Plain language edition 0.1.0 of QOFT Lab. Shared numerical engine: 0.1.2.
Source baseline: `57459dcf2203ff1bbd3ad53eb89d0941c95901c6`.
Classification: presentation and export adapter for the existing DEVELOP
numerical realization. Canonical weight: NONE.

## Open the second edition

```bash
npm ci
npm run dev
# Open http://localhost:5173/plain.html
```

The original edition stays at `/index.html`. Each edition links to the other.
Following that link loads a fresh page and resets the simulation.
The build emits both HTML files. With the repository's Pages base path, the
second edition is served at `/qoft-lab/plain.html` after deployment.

## What this app does

The simulation has a square grid with periodic boundaries: opposite edges
connect. Each cell holds two separate objects:

1. A complex scalar field value, represented by real and imaginary numbers.
   Its magnitude is amplitude; its angle is phase.
2. A symmetric 2 by 2 metric matrix, represented by three numbers.
   The matrix is visualized as an ellipse.

The dimensions refer to the 2D grid and its matrices. They do not mean
that the entire simulation has only two numbers.

Each step perturbs the matrices using seeded random values and rejects
proposals with nonpositive determinants. A scalar signal is calculated
from each accepted matrix. The field then combines its existing value,
a contribution from four neighbors, and a contribution from the matrix
signal. The entire field is normalized. An optional rule reverses the
phase of cells above a relative intensity threshold.

```text
geometry_signal = trace(metric) + 0.1 * log(max(determinant(metric), 1e-12))
neighbor_difference = average_of_four_neighbors(field) - field
neighbor_update = neighbor_coupling * neighbor_difference
geometry_update = geometry_coupling * geometry_signal * field
next_field = normalize((field + neighbor_update) + geometry_update)
relative_intensity = amplitude_squared / (mean_amplitude_squared + 1e-12)
```

`normalize` divides by the whole field's L2 norm plus `1e-12`. The
parentheses preserve the existing floating point addition order.
If enabled, the intervention multiplies both complex components by -1
where relative intensity is strictly greater than 1.67.

This changes phase by 180 degrees and preserves amplitude at that instant.
Later steps can change amplitude because differently phased neighbors
combine differently. It is a reversible numerical intervention.

## Terminology crosswalk

These names describe this implementation. They do not rename or redefine
the corresponding constructs in QOFT canon.

| Original notation or label | Plain edition | Exact local meaning |
| --- | --- | --- |
| X | Grid | Discrete lattice with periodic boundaries |
| psi / ψ | Complex field | One complex scalar per cell |
| g, metric ι | Local metric | Symmetric 2 by 2 matrix per cell |
| Fiber RGB | Matrix components | Three stored matrix entries mapped to RGB |
| Πᴽtoy | Identity copy | Copies the current field; no nontrivial self-model |
| Γtoy | Field update contribution | Weighted neighbor difference plus weighted geometry influence |
| Γnbr | Neighbor difference | Four-neighbor average minus the current field |
| ⊕toy | Add and normalize | The toy's chosen numerical merge rule |
| Ξtoy | Field update | Identity copy, neighbor and geometry additions, normalization |
| α fusion | Neighbor coupling | Weight of the four-neighbor difference |
| β pullback | Geometry coupling | Weight of geometry signal times current field |
| ε metric | Metric variation | Size of the random matrix perturbation |
| Φ_X / Pullback | Geometry signal | Matrix trace plus 0.1 times log determinant |
| ρ in the intensity formula | Mean squared amplitude | Site mean of squared field magnitude |
| C / Collapse C | Relative intensity | Squared amplitude divided by grid mean plus epsilon |
| λc | Phase flip threshold | Fixed local value 1.67 |
| collapsed | Phase flip occurred | Boolean event flag for a step, not number of cells |
| ‖ψ‖ | Field norm | L2 norm across all complex field values |
| ‖Γnbr‖ | Neighbor difference norm | L2 norm after the step, excluding weights and geometry contribution |
| π(ι(x)) = x | Grid pairing | Stored matrix slots preserve the assigned coordinates |

The geometry signal is a custom scalar in this model. It is not a computed
curvature, physical potential, or inferred external force. Here, ρ is an
intensity average; it should not be relabeled as a measured coherence.
The reference to collapse should not be interpreted as physical measurement
collapse or a realization of canonical Λψ.

## Controls and image

- Seed chooses the repeatable random sequence. Grid chooses cell count.
  Changing either restarts the simulation.
- Neighbor coupling weights the difference from the four-neighbor average.
- Geometry coupling weights the signal derived from each metric matrix.
- Metric variation controls the matrix perturbation size.
- Speed changes playback rate, not the per-step arithmetic.
- Phase flip enables the threshold intervention.
- Run 32 step check restarts from the selected seed and runs two trajectories
  to compare recorded measurements, then displays one trajectory.

Ellipses show local metrics. In Composite and Field amplitude views, line
direction represents phase and line length represents amplitude relative
to the current maximum. Cell outlines mark values above threshold;
they are solid with the gate on and dashed with it off.
Colors are scaled for display; use the inspector or CSV for numerical
comparisons. The relative intensity layer shows threshold status even
with phase flips disabled.

For a controlled comparison, load reference settings, run the check and
export. Toggle the phase flip, run the check again, and export. Keep all
other settings fixed. Sliders can be changed during playback; those runs
mix settings and their exports do not contain a slider-change history.

## Software checks

| Check | What is actually checked |
| --- | --- |
| P1 Grid pairing | Stored coordinates cover the grid and match their matrix slots |
| P2 Positive determinants | Minimum stored determinant is positive |
| P3 Three matrix components | Symmetric matrix component count for dimension 2 |
| P4 Intensity rule guard | Finite recorded maximum, function arity, limited source and threshold guards |
| P5 Repeatable run | Equality of recorded telemetry for two identical runs |
| P6 No flips when disabled | All event flags are zero when phase flips are off |

P4 is not a complete dependency audit. P6 is displayed as N/A when the
gate is enabled. Changing settings clears a previously completed check
result so it cannot certify the new configuration.

These checks verify specific software properties. They do not validate
QOFT, consciousness, physical collapse, or a new physical theory. The
ordinary numerical description is a coupled lattice update with
normalization and an optional phase inversion. The model has no trained
AI, memory store, or nontrivial self-model.

## Export compatibility

The plain edition's separate CSV schema contains:

```text
step_index,field_norm,neighbor_difference_norm,minimum_metric_determinant,mean_geometry_signal,peak_relative_intensity,phase_flip_occurred,grid_pairing_ok
```

Values are copied exactly from engine telemetry. Historical CSV headers,
aliases, filenames, and regression fixtures remain available in the original
edition. The two deprecated duplicates of neighbor difference norm are
omitted from the plain export.

`step_index` is zero-based: row zero records the first completed step.
The UI's Step counter reports the number of completed steps. Playback
retains at most 256 rows; the 32 step check retains all 32. The phase flip
event is 0 or 1. The separate cells-above-threshold readout is a count.

## Implementation boundary and verification

Both HTML entry points render the same components under a presentation
context and use the same store and `src/lib/qoft/sim.ts`. There is no
second numerical implementation that could drift away from the original.
The engine, Python reference, canonical crosswalk, threshold, seeded random
sequence, and golden fixture are unchanged.

```bash
npm run check
python public/gu_qoft_toy.py --check-deterministic
VITE_BASE_PATH=/qoft-lab/ npm run build
VITE_BASE_PATH=/qoft-lab/ npm run preview
```

Tests cover the existing engine regression suite and exact transfer of
measurements into the plain CSV with phase flips off and on. JavaScript
and Python use different random generators; cross-language bit identity
is not claimed.
