#!/usr/bin/env python3
"""Complex lattice simulation using NumPy PCG64.

The TypeScript engine uses a different generator. Each implementation is
deterministic within its runtime; their seeded trajectories are not identical.
See docs/MODEL.md for the arithmetic and ORIGINS.md for provenance.
"""


from __future__ import annotations

import argparse
import csv
import hashlib
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

PHASE_FLIP_THRESHOLD = 1.67
EPS_DET = 1e-12
EPS_POWER = 1e-12
EPS_NORM = 1e-12

LAB_VERSION = "0.2.0"


@dataclass(frozen=True)
class Config:
    ticks: int
    seed: int
    n: int
    phase_flip: bool
    grid: int = 8
    matrix_step_size: float = 0.02
    neighbor_weight: float = 0.15
    matrix_weight: float = 0.05


def symmetric_component_count(n: int) -> int:

    return n * (n + 1) // 2


def assert_supported_dimension(cfg: Config) -> None:
    if cfg.n != 2:
        raise SystemExit("FAIL: only spatial dimension --n 2 is supported")
    if symmetric_component_count(cfg.n) != 3:
        raise SystemExit("FAIL P3: a symmetric 2x2 matrix stores 3 components")


def init_state(cfg: Config, rng: np.random.Generator):
    L = cfg.grid

    m11 = np.ones((L, L), dtype=np.float64) + 0.05 * rng.standard_normal((L, L))
    m12 = 0.05 * rng.standard_normal((L, L))
    m22 = np.ones((L, L), dtype=np.float64) + 0.05 * rng.standard_normal((L, L))

    for _ in range(8):
        det = m11 * m22 - m12 * m12
        bad = det <= 0
        if not np.any(bad):
            break
        m11 = np.where(bad, np.abs(m11) + 1.0, m11)
        m22 = np.where(bad, np.abs(m22) + 1.0, m22)
        m12 = np.where(bad, 0.0, m12)
    matrices = np.stack([m11, m12, m22], axis=-1)
    site_i, site_j = np.meshgrid(np.arange(L), np.arange(L), indexing="ij")

    field = rng.normal(size=(L, L)) + 1j * rng.normal(size=(L, L))
    field = field / (np.linalg.norm(field) + EPS_NORM)


    return matrices, field, site_i, site_j


def matrix_determinant(matrices: np.ndarray) -> np.ndarray:
    return matrices[..., 0] * matrices[..., 2] - matrices[..., 1] ** 2


def matrix_coupling(matrices: np.ndarray) -> np.ndarray:
    """Trace plus 0.1 times the log of the clamped determinant."""
    tr = matrices[..., 0] + matrices[..., 2]
    d = matrix_determinant(matrices)
    return tr + 0.1 * np.log(np.maximum(d, EPS_DET))


def matrix_at(matrices: np.ndarray, site_i: np.ndarray, site_j: np.ndarray, i: int, j: int) -> dict:

    return {"x": (int(site_i[i, j]), int(site_j[i, j])), "matrices": matrices[i, j]}


def site_coordinates(section: dict) -> tuple[int, int]:

    return section["x"]


def site_mapping_ok(matrices: np.ndarray, site_i: np.ndarray, site_j: np.ndarray) -> int:

    if matrices.ndim != 3 or matrices.shape[-1] != symmetric_component_count(2):
        return 0
    L = matrices.shape[0]
    if site_i.shape != (L, L) or site_j.shape != (L, L):
        return 0
    seen: set[tuple[int, int]] = set()
    for i in range(L):
        for j in range(L):
            sec = matrix_at(matrices, site_i, site_j, i, j)
            x = site_coordinates(sec)
            if x != (i, j):
                return 0
            if x in seen:
                return 0
            seen.add(x)
    return 1 if len(seen) == L * L else 0


def update_matrices(matrices: np.ndarray, rng: np.random.Generator, eps: float) -> np.ndarray:
    """Apply symmetric traceless Gaussian perturbations; reject nonpositive determinants."""
    sigma = rng.standard_normal(matrices.shape)

    tr = sigma[..., 0] + sigma[..., 2]
    sigma = sigma.copy()
    sigma[..., 0] -= 0.5 * tr
    sigma[..., 2] -= 0.5 * tr
    cand = matrices + eps * sigma
    det = matrix_determinant(cand)
    keep = det > 0
    out = matrices.copy()
    out[keep] = cand[keep]
    return out


def neighbor_residual(field: np.ndarray) -> np.ndarray:
    """Periodic orthogonal-neighbor average minus the current field."""
    up = np.roll(field, -1, axis=0)
    down = np.roll(field, 1, axis=0)
    left = np.roll(field, -1, axis=1)
    right = np.roll(field, 1, axis=1)
    avg = 0.25 * (up + down + left + right)
    return avg - field


def compute_update(field: np.ndarray, coupling_field: np.ndarray, neighbor_weight: float, matrix_weight: float) -> np.ndarray:

    return neighbor_weight * neighbor_residual(field) + matrix_weight * (coupling_field * field)


def add_and_normalize(base_field: np.ndarray, update: np.ndarray) -> np.ndarray:

    nxt = base_field + update
    return nxt / (np.linalg.norm(nxt) + EPS_NORM)


def step_field_presummed(field: np.ndarray, coupling_field: np.ndarray, neighbor_weight: float, matrix_weight: float) -> np.ndarray:
    """Preserve the left-associated arithmetic of the original implementation."""
    return add_and_normalize(field, compute_update(field, coupling_field, neighbor_weight, matrix_weight))


def step_field_reference(field: np.ndarray, coupling_field: np.ndarray, neighbor_weight: float, matrix_weight: float) -> np.ndarray:
    """Preserve the left-associated arithmetic of the original implementation."""
    gterm = neighbor_residual(field)
    nxt = field + neighbor_weight * gterm + matrix_weight * (coupling_field * field)
    return nxt / (np.linalg.norm(nxt) + EPS_NORM)


def step_field(field: np.ndarray, coupling_field: np.ndarray, neighbor_weight: float, matrix_weight: float) -> np.ndarray:
    """Preserve the left-associated arithmetic of the original implementation."""
    base_field = field
    gterm = neighbor_residual(base_field)
    nxt = base_field + neighbor_weight * gterm + matrix_weight * (coupling_field * base_field)
    return nxt / (np.linalg.norm(nxt) + EPS_NORM)


def relative_power_metric(field: np.ndarray) -> tuple[np.ndarray, float, float]:
    """Return site power ratios, their maximum, and mean site power."""
    mag2 = np.abs(field) ** 2
    mean_power = float(np.mean(mag2))
    relative_power = mag2 / (mean_power + EPS_POWER)
    return relative_power, float(np.max(relative_power)), mean_power


def phase_flip_gate(field: np.ndarray, enabled: bool) -> tuple[np.ndarray, float, int]:
    """Negate high-power sites; return a binary event flag rather than a count."""
    relative_power, maxRelativePower, _mean_power = relative_power_metric(field)
    phaseFlipApplied = 0
    out = field
    if enabled:
        mask = relative_power > PHASE_FLIP_THRESHOLD
        if np.any(mask):
            out = field.copy()
            out[mask] *= -1.0
            phaseFlipApplied = 1
    return out, maxRelativePower, phaseFlipApplied


def relative_power_check_ok() -> bool:
    values, peak, mean = relative_power_metric(np.array([1 + 0j, 0 + 1j]))
    expected = 1 / (1 + EPS_POWER)
    return bool(mean == 1 and peak == expected and np.all(values == expected))


def run(cfg: Config) -> list[dict]:
    assert_supported_dimension(cfg)
    rng = np.random.default_rng(cfg.seed)
    matrices, field, site_i, site_j = init_state(cfg, rng)
    rows: list[dict] = []

    for tick in range(cfg.ticks):

        matrices = update_matrices(matrices, rng, cfg.matrix_step_size)

        coupling_field = matrix_coupling(matrices)

        field = step_field(field, coupling_field, cfg.neighbor_weight, cfg.matrix_weight)

        field, maxRelativePower, phaseFlipApplied = phase_flip_gate(field, cfg.phase_flip)

        det = matrix_determinant(matrices)
        gnorm = float(np.linalg.norm(neighbor_residual(field)))
        row = {
            "schemaVersion": 2,
            "tick": tick,
            "stateNorm": float(np.linalg.norm(field)),
            "neighborResidualNorm": gnorm,
            "minDeterminant": float(np.min(det)),
            "meanMatrixCoupling": float(np.mean(coupling_field)),
            "maxRelativePower": maxRelativePower,
            "phaseFlipApplied": int(phaseFlipApplied),
            "siteMappingOk": int(site_mapping_ok(matrices, site_i, site_j)),
        }
        rows.append(row)
    return rows


def check_pass(rows: list[dict], cfg: Config) -> tuple[bool, list[str]]:
    fails: list[str] = []

    if not all(r["siteMappingOk"] == 1 for r in rows):
        fails.append("P1 site mapping")

    if not all(r["minDeterminant"] > 0 for r in rows):
        fails.append("P2 matrix_determinant")

    if symmetric_component_count(cfg.n) != 3:
        fails.append("P3 matrix components")

    if any(not np.isfinite(r["maxRelativePower"]) for r in rows):
        fails.append("P4 maxRelativePower nonfinite")
    if not relative_power_check_ok():
        fails.append("P4 relative power")

    if not cfg.phase_flip and any(r["phaseFlipApplied"] != 0 for r in rows):
        fails.append("P6 phase flip disabled")

    return (len(fails) == 0), fails


def write_csv(rows: list[dict], path: Path) -> None:
    fields = [
        "schemaVersion",
        "tick",
        "stateNorm",
        "neighborResidualNorm",
        "minDeterminant",
        "meanMatrixCoupling",
        "maxRelativePower",
        "phaseFlipApplied",
        "siteMappingOk",
    ]
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow(r)


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def assert_tick_equivalent(seed: int = 0, L: int = 8) -> None:

    rng = np.random.default_rng(seed)
    field = rng.normal(size=(L, L)) + 1j * rng.normal(size=(L, L))
    field = field / (np.linalg.norm(field) + EPS_NORM)
    coupling_field = rng.normal(size=(L, L))
    neighbor_weight, matrix_weight = 0.15, 0.05
    a = step_field_reference(field, coupling_field, neighbor_weight, matrix_weight)
    b = step_field(field, coupling_field, neighbor_weight, matrix_weight)
    if not np.array_equal(a, b):
        raise SystemExit("FAIL: step_field is not bit-identical to the v0.1.0 tick")

    c = step_field_presummed(field, coupling_field, neighbor_weight, matrix_weight)
    if not np.allclose(a, c, rtol=1e-15, atol=1e-15):
        raise SystemExit("FAIL: pre-summed update differs beyond tolerance")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Lattice Dynamics Lab Python reference v0.2.0")
    p.add_argument("--ticks", type=int, default=32)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--n", type=int, default=2)
    p.add_argument("--phase-flip", choices=["on", "off"], default="off")
    p.add_argument("--out", type=str, default="")
    p.add_argument("--check-deterministic", action="store_true")
    args = p.parse_args(argv)

    cfg = Config(
        ticks=args.ticks,
        seed=args.seed,
        n=args.n,
        phase_flip=(args.phase_flip == "on"),
    )
    out = Path(args.out) if args.out else Path(f"telemetry_seed{cfg.seed}_ticks{cfg.ticks}_phaseflip{args.phase_flip}.csv")

    assert_tick_equivalent()

    rows = run(cfg)
    write_csv(rows, out)

    ok, fails = check_pass(rows, cfg)

    # Every CLI run checks deterministic replay; the flag is retained for explicit scripts.
    rows2 = run(cfg)
    tmp = out.with_suffix(".tmp.csv")
    write_csv(rows2, tmp)
    if file_sha256(out) != file_sha256(tmp):
        fails.append("P5 deterministic")
        ok = False
    tmp.unlink(missing_ok=True)

    status = "PASS" if ok and not fails else "FAIL"
    print(f"{status} P1-P6 fails={fails or '[]'} out={out}")
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
