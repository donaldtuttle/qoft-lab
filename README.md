# Lattice Dynamics Lab

An interactive, deterministic simulation of a complex field on a 2D grid.
Each cell holds a complex number and a symmetric 2x2 matrix. Local coupling,
seeded matrix perturbations, and global normalization update the field.
An optional phase flip changes the sign of values above a relative-power threshold.

## Why care?

An animated pattern can hide which rule caused a change. This lab lets you
inspect the state, switch an intervention on or off, replay the same inputs,
and export the numbers behind the picture. It is a small numerical sandbox
for learning, debugging, and designing controlled experiments.

## Try this

1. Select **Load reference defaults**, then **Check run · 32 ticks**.
2. Inspect the P1-P6 checks, hover a cell, and switch between the field,
   matrix, relative-power, and coupling views.
3. Export the CSV. Enable **Phase-flip gate** and run the same check again.
   Compare `phaseFlipApplied` and `neighborResidualNorm`.

The gate preserves each cell's power at the instant it flips. Later updates
can diverge because neighboring complex values now have different relative phases.
Changing a coupling while playing changes the experiment; reset and use fixed
settings for controlled comparisons.

## Run locally

Requires Node.js 22.18 or newer.

```bash
npm ci
npm run dev
```

```bash
npm run check
python -m venv .venv
# Activate the environment, then:
pip install -r requirements-ci.txt
python -m unittest discover -s tests -v
python public/lattice_reference.py --phase-flip on --check-deterministic
```

The browser engine uses sfc32. The Python reference uses NumPy PCG64.
Each replays within its own runtime; equal seeds do not imply equal trajectories
between these two implementations.

## What is verified?

- Coordinate mapping, matrix storage, neighbor stencil, and telemetry schema.
- Deterministic replay and preservation of the original numerical trajectories
  on a pinned migration suite.
- Phase-flip threshold behavior, power preservation, and reversibility.
- Historical CSV compatibility through an explicit adapter.

These are software and numerical regression checks. Performance on an external
prediction, retrieval, or learning task has not been evaluated.
The model has not been calibrated against physical measurements.
See [the model contract](docs/MODEL.md) for exact operations and limitations,
and [the validation record](docs/VALIDATION.md) for executed checks.

## Documentation

- [Visual guide](docs/VISUAL_GUIDE.md): read the canvas and telemetry.
- [Model contract](docs/MODEL.md): state, update order, checks, and experiments.
- [Migration guide](docs/MIGRATION.md): API and schema changes.
- [Origins](ORIGINS.md): pinned source, license, and historical artifacts.

## Hosting

This is a standalone Vite application. `npm run build` writes `dist/`.
The included GitHub Actions workflow checks the application before deploying
`main` through GitHub Pages. Set the repository's **Settings > Pages > Source**
to **GitHub Actions** before the first deployment. Pull requests only run checks.

The Pages asset prefix is derived from the repository name. A production build
records its source commit, repository, application version, and telemetry schema
in `version.json`. The Model panel links to that source commit.

```bash
VITE_BASE_PATH=/lattice-dynamics-lab/ npm run build
VITE_BASE_PATH=/lattice-dynamics-lab/ npm run preview
```

No new hosted deployment is asserted by this source migration. Historical hosted
applications remain separate builds until explicitly updated.

## License

MIT. The original copyright notice is preserved in [LICENSE](LICENSE).
