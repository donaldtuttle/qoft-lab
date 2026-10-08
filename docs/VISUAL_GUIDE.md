# Reading the lab

The canvas shows a grid of complex numbers and small symmetric matrices.
A complex number has a magnitude and a phase, which can be drawn as the length
and direction of a line. The matrices are drawn as ellipses.

## Canvas layers

| Layer | What you see |
| --- | --- |
| Composite | Field shading, phase lines, matrix ellipses, and threshold borders |
| Complex field | Relative magnitude shading and phase lines |
| Matrix ellipses | Ellipses derived from matrix eigenvalues and directions, over field shading |
| Matrix RGB | Red, green, and blue encode the three matrix components |
| Relative power | Site power relative to the current grid mean |
| Matrix coupling | The scalar computed from matrix trace and determinant |

The ellipse drawing clamps eigenvalues for visibility. Brightness and phase-line
length are scaled to the current frame's maximum magnitude. Coupling shading is
scaled to the frame's minimum and maximum. These display mappings are not the
update equations, and colors should not be compared as absolute measurements
between frames. Use the numeric inspector or CSV for exact values.

Cells above the power threshold have borders. A dashed border means the gate is
disabled; a solid border means it is enabled. A border indicates a qualifying
site, not evidence of an event in some other model.

Hover a cell to inspect its numbers. Click to pin the selection. The inspector
shows matrix components, determinant, complex magnitude and phase, relative power,
and coupling. Phase is measured in radians.

## Run controls

**Play** advances continuously; **Step** advances once; **Reset** starts again
from the selected seed. **Check run · 32 ticks** creates a fresh run and compares
it with a second fresh run using the same configuration.

**Neighbor coupling** controls the tendency to average adjacent complex values.
**Matrix coupling** scales each site's field using its derived matrix scalar.
**Matrix step size** controls the perturbation magnitude.
**Phase-flip gate** reverses selected field vectors without changing their lengths
at that instant. This can change subsequent neighbor interactions.

## Read the evidence

P1-P6 report implementation checks. P5 remains pending during ordinary playback
because a second matched run has not been compared. The 32-tick check performs
that comparison.

Peak relative power indicates concentration relative to the grid mean. Minimum
determinant monitors the matrix acceptance rule. Mean matrix coupling summarizes
the scalar input to the field update. Neighbor residual norm measures local
variation after the tick; it excludes coupling weights and the matrix term.

For a useful comparison, load reference defaults, run with the gate disabled,
export CSV, then enable the gate and run again. Keep the seed and other settings
fixed. An altered trajectory establishes that the gate influences the computation.
A separate task and baseline are needed to decide whether that influence is useful.
