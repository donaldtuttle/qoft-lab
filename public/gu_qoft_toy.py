#!/usr/bin/env python3
"""
gu_qoft_toy.py — runnable GU×QOFT *calculus toy* (not a TOE).

QOFT: tick / operator contract on ψ (observer field on X).
GU names (ANALOGY only): X, Y=Met(X), ι, π, ι*.

BANNED (run FAILs if present in dynamics):
  Y==ψ, Shiab in C, 14 in C, G==Y, retrieve-as-ID.

UNDEFINED / not coded: Shiab, G=H⋉N simulation, spinors, U(64,64), n=4.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

# --- fixed constants (QOFT-ish gate on ψ only; no dim(Y), no 14) ---
LAMBDA_C = 1.67
EPS_DET = 1e-12
EPS_RHO = 1e-12
EPS_NORM = 1e-12


@dataclass(frozen=True)
class Config:
    ticks: int
    seed: int
    n: int  # spatial dim of X; only 2 supported in v0
    collapse: bool
    grid: int = 8
    epsilon_g: float = 0.02
    alpha: float = 0.15
    beta: float = 0.05


def fiber_dim(n: int) -> int:
    """Independent components of symmetric bilinear forms on R^n."""
    return n * (n + 1) // 2


def assert_v0(cfg: Config) -> None:
    if cfg.n != 2:
        raise SystemExit("FAIL: v0 only supports --n 2 (n=4 OUT OF SCOPE)")
    if fiber_dim(cfg.n) != 3:
        raise SystemExit("FAIL P3: n=2 fiber must have exactly 3 components")


def init_state(cfg: Config, rng: np.random.Generator):
    L = cfg.grid
    # g components per site: g11, g12, g22  → SPD-ish start (Riemannian det>0)
    g11 = np.ones((L, L), dtype=np.float64) + 0.05 * rng.standard_normal((L, L))
    g12 = 0.05 * rng.standard_normal((L, L))
    g22 = np.ones((L, L), dtype=np.float64) + 0.05 * rng.standard_normal((L, L))
    # force det>0 initially
    for _ in range(8):
        det = g11 * g22 - g12 * g12
        bad = det <= 0
        if not np.any(bad):
            break
        g11 = np.where(bad, np.abs(g11) + 1.0, g11)
        g22 = np.where(bad, np.abs(g22) + 1.0, g22)
        g12 = np.where(bad, 0.0, g12)
    g = np.stack([g11, g12, g22], axis=-1)  # (L,L,3)

    psi = rng.normal(size=(L, L)) + 1j * rng.normal(size=(L, L))
    psi = psi / (np.linalg.norm(psi) + EPS_NORM)

    # Y-native scalar Φ_Y(x,g): fiber-dependent (ANALOGY ι* pullback)
    # Φ_Y = tr(g) + 0.1*log(det(g)+eps) — lives as function of (x,g), not ψ
    return g, psi


def det_g(g: np.ndarray) -> np.ndarray:
    return g[..., 0] * g[..., 2] - g[..., 1] ** 2


def phi_Y(g: np.ndarray) -> np.ndarray:
    """Y-native scalar field as function of fiber coordinates (x,g)."""
    tr = g[..., 0] + g[..., 2]
    d = det_g(g)
    return tr + 0.1 * np.log(np.maximum(d, EPS_DET))


def section_law_ok(g: np.ndarray) -> int:
    """π∘ι=id: ι stores g at each x; π forgets g and returns x.
    In this discrete toy, sites *are* x; storing g_t(x) at site x satisfies the law.
    """
    # structural: array indexed by x implies π(ι(x))=x if we never reindex
    return 1 if g.ndim == 3 and g.shape[-1] == fiber_dim(2) else 0


def metric_step(g: np.ndarray, rng: np.random.Generator, eps: float) -> np.ndarray:
    """g ← g + ε σ with σ symmetric 2-tensor (3 comps); reject if det<=0."""
    sigma = rng.standard_normal(g.shape)
    # optional mild traceless bias: subtract half-trace from diagonal comps
    tr = sigma[..., 0] + sigma[..., 2]
    sigma = sigma.copy()
    sigma[..., 0] -= 0.5 * tr
    sigma[..., 2] -= 0.5 * tr
    cand = g + eps * sigma
    det = det_g(cand)
    keep = det > 0
    out = g.copy()
    out[keep] = cand[keep]
    return out


def gamma_psi(psi: np.ndarray) -> np.ndarray:
    """Γ(ψ) = discrete neighbor average − ψ  (typed fusion stand-in, NOT Shiab)."""
    up = np.roll(psi, -1, axis=0)
    down = np.roll(psi, 1, axis=0)
    left = np.roll(psi, -1, axis=1)
    right = np.roll(psi, 1, axis=1)
    avg = 0.25 * (up + down + left + right)
    return avg - psi


def qoft_tick(psi: np.ndarray, phi_x: np.ndarray, alpha: float, beta: float) -> np.ndarray:
    """ψ ← normalize(ψ + α Γ(ψ) + β Φ_X · ψ). ⊕ stand-in = additive typed update then normalize."""
    gterm = gamma_psi(psi)
    nxt = psi + alpha * gterm + beta * (phi_x * psi)
    return nxt / (np.linalg.norm(nxt) + EPS_NORM)


def collapse_gate(psi: np.ndarray, enabled: bool) -> tuple[np.ndarray, float, int]:
    """
    C = |ψ|² / (ρ + ε), ρ = site mean |ψ|².
    If C > λ_c, flip local phase lock (multiply by -1 on those sites).
    Does NOT use 14, dim(Y), or Shiab.
    """
    mag2 = np.abs(psi) ** 2
    rho = float(np.mean(mag2))
    C = mag2 / (rho + EPS_RHO)
    C_max = float(np.max(C))
    collapsed = 0
    out = psi
    if enabled:
        mask = C > LAMBDA_C
        if np.any(mask):
            out = psi.copy()
            out[mask] *= -1.0
            collapsed = 1
    return out, C_max, collapsed


def run(cfg: Config) -> list[dict]:
    assert_v0(cfg)
    rng = np.random.default_rng(cfg.seed)
    g, psi = init_state(cfg, rng)
    rows: list[dict] = []

    for t in range(cfg.ticks):
        # 1) metric step on ι = g
        g = metric_step(g, rng, cfg.epsilon_g)
        # 2) pull-back toy: Φ_X = Φ_Y(x, g_t(x))
        phi_x = phi_Y(g)
        # 3) QOFT tick on ψ only
        psi = qoft_tick(psi, phi_x, cfg.alpha, cfg.beta)
        # 4) optional collapse on ψ only
        psi, C_max, collapsed = collapse_gate(psi, cfg.collapse)

        det = det_g(g)
        row = {
            "t": t,
            "stateNorm": float(np.linalg.norm(psi)),
            "reflexNorm": float(np.linalg.norm(gamma_psi(psi))),
            "det_g_min": float(np.min(det)),
            "pullback_mean": float(np.mean(phi_x)),
            "C_max": C_max,
            "collapsed": int(collapsed),
            "section_law_ok": int(section_law_ok(g)),
        }
        rows.append(row)
    return rows


def check_pass(rows: list[dict], cfg: Config, csv_path: Path | None = None) -> tuple[bool, list[str]]:
    fails: list[str] = []
    # P1
    if not all(r["section_law_ok"] == 1 for r in rows):
        fails.append("P1 section_law")
    # P2
    if not all(r["det_g_min"] > 0 for r in rows):
        fails.append("P2 det_g")
    # P3
    if fiber_dim(cfg.n) != 3:
        fails.append("P3 fiber")
    # P4 — structural: source must not feed 14 into C (enforced by code review + marker)
    # Runtime marker: C_max finite and independent of banned constants
    if any(not np.isfinite(r["C_max"]) for r in rows):
        fails.append("P4 C_max nonfinite")
    # P6
    if not cfg.collapse and any(r["collapsed"] != 0 for r in rows):
        fails.append("P6 collapse-off")
    # P5 checked by caller via double run
    return (len(fails) == 0), fails


def write_csv(rows: list[dict], path: Path) -> None:
    fields = [
        "t",
        "stateNorm",
        "reflexNorm",
        "det_g_min",
        "pullback_mean",
        "C_max",
        "collapsed",
        "section_law_ok",
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


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="GU×QOFT calculus toy (n=2)")
    p.add_argument("--ticks", type=int, default=32)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--n", type=int, default=2)
    p.add_argument("--collapse", choices=["on", "off"], default="off")
    p.add_argument("--out", type=str, default="")
    p.add_argument("--check-deterministic", action="store_true")
    args = p.parse_args(argv)

    cfg = Config(
        ticks=args.ticks,
        seed=args.seed,
        n=args.n,
        collapse=(args.collapse == "on"),
    )
    out = Path(args.out) if args.out else Path(f"telemetry_seed{cfg.seed}_ticks{cfg.ticks}_collapse{args.collapse}.csv")

    rows = run(cfg)
    write_csv(rows, out)

    ok, fails = check_pass(rows, cfg)
    # P5
    if args.check_deterministic or True:
        rows2 = run(cfg)
        tmp = out.with_suffix(".tmp.csv")
        write_csv(rows2, tmp)
        if file_sha256(out) != file_sha256(tmp):
            fails.append("P5 deterministic")
            ok = False
        tmp.unlink(missing_ok=True)

    # P4: collapse uses LAMBDA_C only (no dim-Y / 14 / Shiab inputs in gate)
    if LAMBDA_C == 14 or LAMBDA_C == fiber_dim(4) + 4:
        fails.append("P4 banned constant in lambda")
        ok = False
    # Ban markers must remain absent from executable gate
    gate_src = collapse_gate.__code__.co_consts
    if 14 in gate_src:
        fails.append("P4 literal 14 in collapse_gate")
        ok = False

    status = "PASS" if ok and not fails else "FAIL"
    print(f"{status} P1-P6 fails={fails or '[]'} out={out}")
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
