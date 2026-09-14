#!/usr/bin/env python3
"""
gu_qoft_toy.py — runnable GU×QOFT *calculus toy* (not a TOE).

DEVELOP Typed Realization of the QOFT boundary
    Ξ(ψ) = Πᴽ(ψ) ⊕ Γ(ψ; ctx)
Canonical weight: NONE. Not a canon amendment.

This toy:
    Ψtoy      := normalized complex scalar fields on the L×L lattice
    Ψᴽtoy     := Ψtoy
    Πᴽtoy(ψ; ctx, M) := ψ             (identity; ctx, M unused)
    Canonical Πᴽ : Ψ × Ctx × M → Ψᴽ. This toy fixes ctx, M unused.
    ctx_toy := (g, α, β, L); M unused/absent
    encode_A = decode_B = id on Ψtoy
    Gtoy      := complex lattice update fields
    Γtoy(ψ;g) := α·(neighbor_avg(ψ)−ψ) + β·Φ_X(g)⊙ψ
    ⊕toy      := normalize(ψᴽ + γ)
    Ξtoy      := Πᴽtoy(ψ) ⊕toy Γtoy(ψ; g)

QOFT: tick / operator contract on ψ (observer field on X).
GU names (ANALOGY only): X, Y=Met(X), ι, π, ι*.

The optional phase-flip gate is an experiment-only intervention (× −1 on
sites with C > λ_c). It is not a realization of canonical Λψ.
λ_c = 1.67 is a toy/local threshold, not a QOFT universal constant.

Model constraints (not one numeric check):
  Y==ψ, Shiab in C, 14 in C, G==Y, retrieve-as-ID.

UNDEFINED / not coded: Shiab, G=H⋉N simulation, spinors, U(64,64), n=4.

Intended numerical dynamics: unchanged from v0.1.0.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import inspect
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np

# --- fixed constants (QOFT-ish gate on ψ only; no dim(Y), no 14) ---
LAMBDA_C = 1.67  # toy/local threshold, not a QOFT universal constant
EPS_DET = 1e-12
EPS_RHO = 1e-12
EPS_NORM = 1e-12

LAB_VERSION = "0.1.2"


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
    site_i, site_j = np.meshgrid(np.arange(L), np.arange(L), indexing="ij")

    psi = rng.normal(size=(L, L)) + 1j * rng.normal(size=(L, L))
    psi = psi / (np.linalg.norm(psi) + EPS_NORM)

    # Y-native scalar Φ_Y(x,g): fiber-dependent (ANALOGY ι* pullback)
    # Φ_Y = tr(g) + 0.1*log(det(g)+eps) — lives as function of (x,g), not ψ
    return g, psi, site_i, site_j


def det_g(g: np.ndarray) -> np.ndarray:
    return g[..., 0] * g[..., 2] - g[..., 1] ** 2


def phi_Y(g: np.ndarray) -> np.ndarray:
    """Y-native scalar field as function of fiber coordinates (x,g)."""
    tr = g[..., 0] + g[..., 2]
    d = det_g(g)
    return tr + 0.1 * np.log(np.maximum(d, EPS_DET))


def iota(g: np.ndarray, site_i: np.ndarray, site_j: np.ndarray, i: int, j: int) -> dict:
    """ι(x) = (x_stored, g(x)). Coordinates live in the section pairing."""
    return {"x": (int(site_i[i, j]), int(site_j[i, j])), "g": g[i, j]}


def pi_section(section: dict) -> tuple[int, int]:
    """π forgets the fiber and returns the base point."""
    return section["x"]


def section_law_ok(g: np.ndarray, site_i: np.ndarray, site_j: np.ndarray) -> int:
    """π∘ι=id at every site, unique coverage of X, fiber present."""
    if g.ndim != 3 or g.shape[-1] != fiber_dim(2):
        return 0
    L = g.shape[0]
    if site_i.shape != (L, L) or site_j.shape != (L, L):
        return 0
    seen: set[tuple[int, int]] = set()
    for i in range(L):
        for j in range(L):
            sec = iota(g, site_i, site_j, i, j)
            x = pi_section(sec)
            if x != (i, j):
                return 0
            if x in seen:
                return 0
            seen.add(x)
    return 1 if len(seen) == L * L else 0


def encode_A(psi: np.ndarray) -> np.ndarray:
    """encode_A : Ψtoy → Ψtoy. Identity."""
    return psi


def decode_B(psi: np.ndarray) -> np.ndarray:
    """decode_B : Ψtoy → Ψtoy. Identity."""
    return psi


def pi_reflex_toy(psi: np.ndarray, ctx=None, m=None) -> np.ndarray:
    """Πᴽtoy(ψ; ctx, M) := ψ. ctx and M unused in this realization."""
    return encode_A(psi)


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
    """Γ_nbr(ψ) = discrete neighbor average − ψ  (typed fusion stand-in, NOT Shiab)."""
    up = np.roll(psi, -1, axis=0)
    down = np.roll(psi, 1, axis=0)
    left = np.roll(psi, -1, axis=1)
    right = np.roll(psi, 1, axis=1)
    avg = 0.25 * (up + down + left + right)
    return avg - psi


def gamma_toy(psi: np.ndarray, phi_x: np.ndarray, alpha: float, beta: float) -> np.ndarray:
    """Γtoy(ψ; g) := α·(neighbor_avg(ψ)−ψ) + β·Φ_X(g)⊙ψ. Gtoy is this field."""
    return alpha * gamma_psi(psi) + beta * (phi_x * psi)


def fuse_toy(psi_star: np.ndarray, gamma: np.ndarray) -> np.ndarray:
    """⊕toy(ψᴽ, γ) := normalize(ψᴽ + γ). Internal addition lives here."""
    nxt = psi_star + gamma
    return nxt / (np.linalg.norm(nxt) + EPS_NORM)


def xi_toy(psi: np.ndarray, phi_x: np.ndarray, alpha: float, beta: float) -> np.ndarray:
    """Abstract Ξtoy := Πᴽtoy(ψ) ⊕toy Γtoy(ψ; g) on a pre-summed γ."""
    return fuse_toy(pi_reflex_toy(psi), gamma_toy(psi, phi_x, alpha, beta))


def qoft_tick_monolithic(psi: np.ndarray, phi_x: np.ndarray, alpha: float, beta: float) -> np.ndarray:
    """v0.1.0 formula, kept as the numerical-equivalence pin.
    ψ ← normalize(ψ + α Γ_nbr(ψ) + β Φ_X · ψ)
    """
    gterm = gamma_psi(psi)
    nxt = psi + alpha * gterm + beta * (phi_x * psi)
    return nxt / (np.linalg.norm(nxt) + EPS_NORM)


def qoft_tick(psi: np.ndarray, phi_x: np.ndarray, alpha: float, beta: float) -> np.ndarray:
    """ψ ← Ξtoy(ψ; g), IEEE-realized as the v0.1.0 three-term sum.

    Πᴽtoy is applied (identity). Internal addition is left-associated
    `ψ + α Γ_nbr + β Φ⊙ψ` so the tick is bit-identical to v0.1.0.
    `xi_toy` (fuse of a pre-summed Γtoy) may differ by ulps.
    """
    psi_star = pi_reflex_toy(psi)
    gterm = gamma_psi(psi_star)
    nxt = psi_star + alpha * gterm + beta * (phi_x * psi_star)
    return nxt / (np.linalg.norm(nxt) + EPS_NORM)


def collapse_metric(psi: np.ndarray) -> tuple[np.ndarray, float, float]:
    """
    C = |ψ|² / (ρ + ε), ρ = site mean |ψ|².

    Inputs: ψ only. No metric, no fiber, no dim(Y), no 14, no Shiab.
    """
    mag2 = np.abs(psi) ** 2
    rho = float(np.mean(mag2))
    C = mag2 / (rho + EPS_RHO)
    return C, float(np.max(C)), rho


def collapse_gate(psi: np.ndarray, enabled: bool) -> tuple[np.ndarray, float, int]:
    """
    Experiment-only local phase flip (× −1) on sites with C > λ_c.
    Preserves |ψ|², is involutive, and is not canonical Λψ.
    """
    C, C_max, _rho = collapse_metric(psi)
    collapsed = 0
    out = psi
    if enabled:
        mask = C > LAMBDA_C
        if np.any(mask):
            out = psi.copy()
            out[mask] *= -1.0
            collapsed = 1
    return out, C_max, collapsed


def p4_isolation_ok() -> bool:
    """Mechanically tested P4: C is a function of ψ only."""
    params = list(inspect.signature(collapse_metric).parameters)
    if params != ["psi"]:
        return False
    if 14 in (collapse_metric.__code__.co_consts or ()):
        return False
    if 14 in (collapse_gate.__code__.co_consts or ()):
        return False
    if LAMBDA_C == 14 or LAMBDA_C == fiber_dim(4) + 4:
        return False
    return True


def run(cfg: Config) -> list[dict]:
    assert_v0(cfg)
    rng = np.random.default_rng(cfg.seed)
    g, psi, site_i, site_j = init_state(cfg, rng)
    rows: list[dict] = []

    for t in range(cfg.ticks):
        # 1) metric step on ι = g
        g = metric_step(g, rng, cfg.epsilon_g)
        # 2) pull-back toy: Φ_X = Φ_Y(x, g_t(x))
        phi_x = phi_Y(g)
        # 3) QOFT tick on ψ only — Ξtoy
        psi = qoft_tick(psi, phi_x, cfg.alpha, cfg.beta)
        # 4) optional phase-flip intervention on ψ only
        psi, C_max, collapsed = collapse_gate(psi, cfg.collapse)

        det = det_g(g)
        gnorm = float(np.linalg.norm(gamma_psi(psi)))
        row = {
            "t": t,
            "stateNorm": float(np.linalg.norm(psi)),
            "gammaNbrNorm": gnorm,
            "gammaNorm": gnorm,  # deprecated alias of gammaNbrNorm
            "reflexNorm": gnorm,  # deprecated v0.1.0 alias
            "det_g_min": float(np.min(det)),
            "pullback_mean": float(np.mean(phi_x)),
            "C_max": C_max,
            "collapsed": int(collapsed),
            "section_law_ok": int(section_law_ok(g, site_i, site_j)),
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
    # P4 — collapse-metric isolation (C = f(ψ) only)
    if any(not np.isfinite(r["C_max"]) for r in rows):
        fails.append("P4 C_max nonfinite")
    if not p4_isolation_ok():
        fails.append("P4 collapse-metric isolation")
    # P6
    if not cfg.collapse and any(r["collapsed"] != 0 for r in rows):
        fails.append("P6 collapse-off")
    # P5 checked by caller via double run
    return (len(fails) == 0), fails


def write_csv(rows: list[dict], path: Path) -> None:
    fields = [
        "t",
        "stateNorm",
        "gammaNbrNorm",
        "gammaNorm",
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


def assert_tick_equivalent(seed: int = 0, L: int = 8) -> None:
    """Decomposed tick must match the v0.1.0 monolithic formula on fixed inputs."""
    rng = np.random.default_rng(seed)
    psi = rng.normal(size=(L, L)) + 1j * rng.normal(size=(L, L))
    psi = psi / (np.linalg.norm(psi) + EPS_NORM)
    phi_x = rng.normal(size=(L, L))
    alpha, beta = 0.15, 0.05
    a = qoft_tick_monolithic(psi, phi_x, alpha, beta)
    b = qoft_tick(psi, phi_x, alpha, beta)
    if not np.array_equal(a, b):
        raise SystemExit("FAIL: qoft_tick is not bit-identical to the v0.1.0 tick")
    # Abstract fuse(Π, Γtoy) is the same operator; IEEE + is not associative.
    c = xi_toy(psi, phi_x, alpha, beta)
    if not np.allclose(a, c, rtol=1e-15, atol=1e-15):
        raise SystemExit("FAIL: abstract Ξtoy drifted from the v0.1.0 tick")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="GU×QOFT calculus toy (n=2) — Typed Realization v0.1.1")
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

    assert_tick_equivalent()

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

    status = "PASS" if ok and not fails else "FAIL"
    print(f"{status} P1-P6 fails={fails or '[]'} out={out}")
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    sys.exit(main())
