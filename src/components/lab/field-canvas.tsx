import { useEffect, useRef } from "react";
import { LAMBDA_C } from "@/lib/qoft/sim";
import { getSim, useLab, type Layer } from "@/stores/lab-store";

type RGB = [number, number, number];

function parseHex(hex: string): RGB {
  const h = hex.trim().replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const u = Math.min(1, Math.max(0, t));
  return [
    a[0] + (b[0] - a[0]) * u,
    a[1] + (b[1] - a[1]) * u,
    a[2] + (b[2] - a[2]) * u,
  ];
}

function css(c: RGB, a = 1): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

function readTokens() {
  const s = getComputedStyle(document.documentElement);
  const tok = (name: string, fallback: string) =>
    s.getPropertyValue(name).trim() || fallback;
  return {
    bg: parseHex(tok("--color-background", "#0b0c0e")),
    fg: parseHex(tok("--color-foreground", "#e6e4df")),
    card: parseHex(tok("--color-card", "#12141a")),
    signal: parseHex(tok("--color-signal", "#6a9eaa")),
    warn: parseHex(tok("--color-warn", "#c4a574")),
    pass: parseHex(tok("--color-pass", "#7d9a7e")),
    faint: parseHex(tok("--color-faint", "#5c5b57")),
    border: parseHex(tok("--color-border", "#2a2c33")),
    paper: parseHex(tok("--color-paper", "#e6e4df")),
    danger: parseHex(tok("--color-destructive", "#b07070")),
  };
}

function eigen2(a: number, b: number, c: number) {
  const tr = a + c;
  const det = a * c - b * b;
  const disc = Math.sqrt(Math.max(tr * tr - 4 * det, 0));
  const l1 = 0.5 * (tr + disc);
  const l2 = 0.5 * (tr - disc);
  let vx = b;
  let vy = l1 - a;
  if (Math.abs(vx) + Math.abs(vy) < 1e-12) {
    vx = l1 - c;
    vy = b;
  }
  if (Math.abs(vx) + Math.abs(vy) < 1e-12) {
    vx = 1;
    vy = 0;
  }
  const n = Math.hypot(vx, vy) || 1;
  return { l1, l2, theta: Math.atan2(vy / n, vx / n) };
}

function drawField(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  layer: Layer,
  hover: { i: number; j: number } | null,
  pinned: { i: number; j: number } | null,
) {
  const pal = readTokens();
  const sim = getSim();
  const L = sim.L;
  const pad = 28;
  const size = Math.min(w, h);
  const originX = (w - size) / 2;
  const originY = (h - size) / 2;
  const inner = size - pad * 2;
  const cell = inner / L;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = css(pal.bg);
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = css(pal.card);
  ctx.beginPath();
  ctx.roundRect(originX + 8, originY + 8, size - 16, size - 16, 12);
  ctx.fill();

  const ox = originX + pad;
  const oy = originY + pad;

  let magMax = 1e-12;
  let phiMin = Infinity;
  let phiMax = -Infinity;
  let cMax = 1e-12;
  const N = L * L;
  for (let k = 0; k < N; k++) {
    const m = Math.hypot(sim.psiR[k] ?? 0, sim.psiI[k] ?? 0);
    if (m > magMax) magMax = m;
    const p = sim.phi[k] ?? 0;
    if (p < phiMin) phiMin = p;
    if (p > phiMax) phiMax = p;
    const ck = sim.C[k] ?? 0;
    if (ck > cMax) cMax = ck;
  }
  const phiSpan = Math.max(phiMax - phiMin, 1e-9);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(ox - 1, oy - 1, inner + 2, inner + 2, 8);
  ctx.clip();

  for (let i = 0; i < L; i++) {
    for (let j = 0; j < L; j++) {
      const k = i * L + j;
      const x = ox + j * cell;
      const y = oy + i * cell;
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      const g11 = sim.g[k * 3] ?? 1;
      const g12 = sim.g[k * 3 + 1] ?? 0;
      const g22 = sim.g[k * 3 + 2] ?? 1;
      const pr = sim.psiR[k] ?? 0;
      const pi = sim.psiI[k] ?? 0;
      const mag = Math.hypot(pr, pi);
      const C = sim.C[k] ?? 0;
      const phi = sim.phi[k] ?? 0;

      if (layer === "fiber") {
        const r = Math.min(1, Math.max(0, (g11 - 0.4) / 1.2));
        const g = Math.min(1, Math.max(0, (g12 + 0.6) / 1.2));
        const b = Math.min(1, Math.max(0, (g22 - 0.4) / 1.2));
        ctx.fillStyle = `rgba(${(40 + r * 180) | 0},${(40 + g * 180) | 0},${(40 + b * 180) | 0},0.95)`;
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
        continue;
      }

      if (layer === "pullback") {
        const t = (phi - phiMin) / phiSpan;
        ctx.fillStyle = css(mix(pal.bg, pal.signal, 0.15 + 0.85 * t));
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
        continue;
      }

      if (layer === "collapse") {
        const t = Math.min(1, C / Math.max(cMax, LAMBDA_C));
        const col = C > LAMBDA_C ? mix(pal.warn, pal.danger, 0.45) : mix(pal.bg, pal.warn, t);
        ctx.fillStyle = css(col);
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
        continue;
      }

      if (layer === "observer") {
        const t = mag / magMax;
        ctx.fillStyle = css(mix(pal.bg, pal.signal, 0.08 + 0.92 * t));
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      } else {
        const t = mag / magMax;
        const heat = Math.max(0, (C - 0.8) / Math.max(LAMBDA_C, 1));
        const base = mix(pal.card, pal.signal, 0.12 + 0.55 * t);
        ctx.fillStyle = css(mix(base, pal.warn, Math.min(0.55, heat)));
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      }

      if (C > LAMBDA_C) {
        ctx.strokeStyle = css(pal.warn, useLab.getState().config.collapse ? 0.9 : 0.35);
        ctx.lineWidth = Math.max(1, cell * 0.04);
        ctx.setLineDash(useLab.getState().config.collapse ? [] : [3, 3]);
        ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
        ctx.setLineDash([]);
      }
    }
  }

  if (layer === "composite" || layer === "metric") {
    ctx.strokeStyle = css(pal.paper, layer === "metric" ? 0.85 : 0.7);
    ctx.lineWidth = Math.max(0.8, cell * 0.045);
    for (let i = 0; i < L; i++) {
      for (let j = 0; j < L; j++) {
        const k = i * L + j;
        const cx = ox + (j + 0.5) * cell;
        const cy = oy + (i + 0.5) * cell;
        const g11 = sim.g[k * 3] ?? 1;
        const g12 = sim.g[k * 3 + 1] ?? 0;
        const g22 = sim.g[k * 3 + 2] ?? 1;
        const { l1, l2, theta } = eigen2(g11, g12, g22);
        const scale = cell * 0.36;
        const rx = scale / Math.sqrt(Math.max(l1, 0.15));
        const ry = scale / Math.sqrt(Math.max(l2, 0.15));
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(theta);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  if (layer === "composite" || layer === "observer") {
    for (let i = 0; i < L; i++) {
      for (let j = 0; j < L; j++) {
        const k = i * L + j;
        const cx = ox + (j + 0.5) * cell;
        const cy = oy + (i + 0.5) * cell;
        const pr = sim.psiR[k] ?? 0;
        const pi = sim.psiI[k] ?? 0;
        const mag = Math.hypot(pr, pi);
        const len = (mag / magMax) * cell * 0.38;
        const ang = Math.atan2(pi, pr);
        ctx.strokeStyle = css(pal.paper, 0.9);
        ctx.lineWidth = Math.max(1, cell * 0.05);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
        ctx.stroke();
        ctx.fillStyle = css(pal.signal);
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1.2, cell * 0.06), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.strokeStyle = css(pal.border, 0.6);
  ctx.lineWidth = 1;
  if (L <= 24) {
    for (let i = 1; i < L; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * cell, oy);
      ctx.lineTo(ox + i * cell, oy + inner);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox, oy + i * cell);
      ctx.lineTo(ox + inner, oy + i * cell);
      ctx.stroke();
    }
  }

  ctx.restore();

  ctx.strokeStyle = css(pal.border);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(ox - 1, oy - 1, inner + 2, inner + 2, 8);
  ctx.stroke();

  const mark = (cellRef: { i: number; j: number } | null, color: RGB, dashed = false) => {
    if (!cellRef) return;
    const x = ox + cellRef.j * cell;
    const y = oy + cellRef.i * cell;
    ctx.save();
    ctx.strokeStyle = css(color, 0.95);
    ctx.lineWidth = 1.5;
    if (dashed) ctx.setLineDash([3, 3]);
    ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
    ctx.restore();
  };
  mark(pinned, pal.paper);
  mark(hover, pal.signal, true);

  ctx.fillStyle = css(pal.faint);
  ctx.font = `500 10px ${getComputedStyle(document.documentElement).getPropertyValue("--font-mono") || "monospace"}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("x", ox + inner / 2, oy + inner + 8);
  ctx.save();
  ctx.translate(ox - 14, oy + inner / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("x′", 0, 0);
  ctx.restore();
}

function cellFromPointer(
  el: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  L: number,
): { i: number; j: number } | null {
  const rect = el.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  const size = Math.min(w, h);
  const originX = (w - size) / 2;
  const originY = (h - size) / 2;
  const pad = 28;
  const inner = size - pad * 2;
  const x = clientX - rect.left - originX - pad;
  const y = clientY - rect.top - originY - pad;
  if (x < 0 || y < 0 || x >= inner || y >= inner) return null;
  const j = Math.min(L - 1, Math.max(0, Math.floor((x / inner) * L)));
  const i = Math.min(L - 1, Math.max(0, Math.floor((y / inner) * L)));
  return { i, j };
}

export function FieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w < 4 || h < 4) return;
      const bw = Math.floor(w * dpr);
      const bh = Math.floor(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const hv = useLab.getState().hover;
      const pn = useLab.getState().pinned;
      drawField(ctx, w, h, useLab.getState().layer, hv, pn);
    };

    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(wrap);
    const unsub = useLab.subscribe(paint);
    return () => {
      ro.disconnect();
      unsub();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative aspect-square w-full min-h-64 lg:aspect-auto lg:h-full lg:min-h-0"
    >
      <canvas
        ref={canvasRef}
        className="size-full touch-none"
        role="img"
        aria-label="Field on X: metric ellipses and observer field"
        onPointerMove={(e) => {
          const cell = cellFromPointer(e.currentTarget, e.clientX, e.clientY, getSim().L);
          if (cell) useLab.getState().setHoverCell(cell.i, cell.j);
          else useLab.getState().setHoverCell(null, null);
        }}
        onPointerLeave={() => useLab.getState().setHoverCell(null, null)}
        onPointerDown={(e) => {
          const cell = cellFromPointer(e.currentTarget, e.clientX, e.clientY, getSim().L);
          if (cell) {
            useLab.getState().setHoverCell(cell.i, cell.j);
            useLab.getState().pinHover();
          }
        }}
      />
    </div>
  );
}
