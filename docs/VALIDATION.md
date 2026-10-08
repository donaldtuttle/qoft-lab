# Validation record

Migration prepared on 2026-10-08 from source commit
`57459dcf2203ff1bbd3ad53eb89d0941c95901c6`.

## Executed locally

Runtime: Linux, Node.js 24.19.0, Python 3.12, NumPy 2.2.6 from the unchanged
`requirements-ci.txt` pin. Dependencies were installed from the npm lockfile.

| Check | Result |
| --- | --- |
| Original TypeScript suite before migration | 20 passed |
| Migrated TypeScript suite | 35 passed |
| TypeScript source comparison | 16 initial states and 1,792 ticks matched exactly |
| Python suite | 6 passed |
| Python source comparison | 1,792 telemetry rows matched exactly across 16 scenarios |
| Python deterministic CLI run | P1-P6 passed |
| TypeScript type checking | Passed |
| Production build | Passed |
| Terminology scan over active application/code/docs | Passed |
| SHA-256 verification of all three fixtures | Passed |

The TypeScript comparison covers all schema-2 numeric fields and state digests
including RNG words. Python comparison covers telemetry, not its full hidden state.
Reference scenarios use seeds 1, 7, and 23; grids 8 and 16; and both gate settings,
for 128 ticks each. Four further scenarios use seed 99, grid 32, both gate settings,
and zero or maximum UI coupling values for 64 ticks each.

The original historical CSV is unchanged. See [ORIGINS.md](../ORIGINS.md) for
source and fixture hashes. These fixtures are regression expectations generated
from the original code, not measured performance on an external task.

## Interface and deployment status

The application typechecks and builds with the new repository's asset prefix.
The patch keeps the original layout and drawing operations. Configuration changes
now clear a stale check result, fresh check runs clear stale cell samples, and the
disabled-gate check is marked N/A when the gate is enabled.

Interactive browser testing and screenshot review were attempted but could not
run in this environment: no Chromium executable was installed, and its download
returned an invalid archive. No claim of completed visual or interaction QA is made.

The production build emits Vite's existing large-bundle advisory (about 800 kB
before gzip). Dependency upgrades and bundle splitting are outside this migration.
The staging branch does not deploy or replace the original application's main
branch. New-repository creation and live deployment remain separate publishing
steps. GitHub Actions results should be read from the branch's actual workflow run.

## Repeat

```bash
npm ci
npm run check
pip install -r requirements-ci.txt
python -m unittest discover -s tests -v
python public/lattice_reference.py --check-deterministic --out telemetry_seed7.csv
```

This establishes implementation parity on the tested inputs and runtimes. It does
not establish universal platform bit identity, external task performance, or a
physical interpretation of the simulated field.
