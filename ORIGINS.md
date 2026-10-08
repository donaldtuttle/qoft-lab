# Origins and reproducibility

Lattice Dynamics Lab is derived from Don Tuttle's MIT-licensed
[qoft-lab](https://github.com/donaldtuttle/qoft-lab), with the source fixed at
[`57459dcf2203ff1bbd3ad53eb89d0941c95901c6`](https://github.com/donaldtuttle/qoft-lab/tree/57459dcf2203ff1bbd3ad53eb89d0941c95901c6).
The source tree's application version is 0.1.2. This successor begins at 0.2.0
because the public API and telemetry schema change.

The original QOFT and Geometric Unity framing remains part of the project's
history. It is not a dependency or scientific premise of this successor. The
new names describe the implemented calculations without assigning them broader
operator meanings. This migration makes no changes to the original theory's
contracts and does not report an audit of its private source corpus.

## Preserved records

- [Original README](https://github.com/donaldtuttle/qoft-lab/blob/57459dcf2203ff1bbd3ad53eb89d0941c95901c6/README.md)
- [Original typed declaration](https://github.com/donaldtuttle/qoft-lab/blob/57459dcf2203ff1bbd3ad53eb89d0941c95901c6/docs/TYPED_REALIZATION.md)
- [Original changelog](https://github.com/donaldtuttle/qoft-lab/blob/57459dcf2203ff1bbd3ad53eb89d0941c95901c6/CHANGELOG.md)
- [Original license](https://github.com/donaldtuttle/qoft-lab/blob/57459dcf2203ff1bbd3ad53eb89d0941c95901c6/LICENSE), copied without modification

Historical evidence is linked at immutable commits. No original result, release,
or frozen declaration is rewritten as a new result. The original repository's
main branch and hosted applications are outside this migration.

## Source file fingerprints

| File at the source commit | SHA-256 |
| --- | --- |
| `src/lib/qoft/sim.ts` | `22094f65809450add88f77ed9c98ca5627b49d78a00c1d07d29ace6fb5b003ed` |
| `public/gu_qoft_toy.py` | `405d657a86f32c3a916881c810adad494fbde47e1a8d821e9cf060772b71ba97` |

## Regression artifacts

`src/lib/lattice/fixtures/v0.1.0-toy-seed7.csv` is the original fixture, preserved
byte for byte. It records 32 ticks with seed 7, grid 8, and the phase gate disabled.
Its earlier source commit is `c344023c8d7e7d0939f3513d617e24c17fddb2fe`.

SHA-256: `8b9ddbaed92ac9818fc46a219e1a256393eee77468e7b3b9b79656ade2620f53`.

The migration fixtures were generated from the clean source checkout, before
comparing the renamed engine. Both generators verify the source commit and
working-file equality with that commit. They do not call the migrated simulation
to obtain expected outputs.

| Migration fixture | SHA-256 |
| --- | --- |
| `migration-v0.2.0.json` | `c2620ac2add2edd161724f570fbcc020367acb9ebe22e2c9d13d4ae7d64d3852` |
| `python-migration-v0.2.0.json` | `f09724fa7700154e09f351d5a5b38779352a0f8968b0cdb7b00863f7f73f9117` |

For TypeScript, hashes cover little-endian float64 encodings of array lengths and
values in this order: matrices, field real, field imaginary, coupling, relative
power, determinants, row coordinates, column coordinates, then tick and the four
RNG words. Python fixture hashes cover sorted compact JSON telemetry rows under
NumPy 2.2.6. Python full internal state is not covered by this fixture.

Regeneration is a maintenance action, not part of ordinary testing:

```bash
git clone https://github.com/donaldtuttle/qoft-lab.git ../qoft-lab-source
git -C ../qoft-lab-source checkout 57459dcf2203ff1bbd3ad53eb89d0941c95901c6
node scripts/generate-migration-fixture.mjs ../qoft-lab-source
python scripts/generate-python-fixture.py ../qoft-lab-source
```

Use the recorded runtimes in [VALIDATION.md](docs/VALIDATION.md). A changed fixture
requires review of its source, parameters, and hashes; do not regenerate expected
values merely to make a failed migration check pass.
