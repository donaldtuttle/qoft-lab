import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { fiberDim, p4IsolationOk } from "@/lib/qoft/sim";
import { fmt } from "@/lib/utils";
import { getSim, useLab } from "@/stores/lab-store";

const INVARIANTS = [
  {
    id: "P1",
    name: "section law",
    hint: "π ∘ ι = id — g is stored at each site x",
  },
  {
    id: "P2",
    name: "det g > 0",
    hint: "Riemannian: rejected updates that would leave the SPD cone",
  },
  {
    id: "P3",
    name: "fiber = 3",
    hint: "Independent components of symmetric bilinear forms on R²",
  },
  {
    id: "P4",
    name: "C = f(ψ) only",
    hint: "Collapse-metric isolation: C uses ψ, not g / fiber / 14. Banned GU ids are model constraints, not this check.",
  },
  {
    id: "P5",
    name: "deterministic",
    hint: "Same seed + config ⇒ identical telemetry",
  },
  {
    id: "P6",
    name: "phase-flip off",
    hint: "When the intervention is off, collapsed stays 0",
  },
] as const;

function liveStatus(id: string): "pass" | "fail" | "pending" {
  const { last, telemetry, result, config } = useLab.getState();
  if (result) {
    const map: Record<string, string> = {
      P1: "P1 section_law",
      P2: "P2 det_g",
      P3: "P3 fiber",
      P4: "P4",
      P5: "P5 deterministic",
      P6: "P6 collapse-off",
    };
    const key = map[id] ?? id;
    const hit = result.fails.some((f) => f.startsWith(key) || f.includes(id));
    if (id === "P5") return result.p5 ? "pass" : "fail";
    return hit ? "fail" : "pass";
  }
  if (!last) return "pending";
  if (id === "P1") return last.section_law_ok === 1 ? "pass" : "fail";
  if (id === "P2") return last.det_g_min > 0 ? "pass" : "fail";
  if (id === "P3") return fiberDim(config.n) === 3 ? "pass" : "fail";
  if (id === "P4")
    return Number.isFinite(last.C_max) && p4IsolationOk() ? "pass" : "fail";
  if (id === "P5") return "pending";
  if (id === "P6") {
    if (config.collapse) return "pending";
    return telemetry.every((r) => r.collapsed === 0) ? "pass" : "fail";
  }
  return "pending";
}

export function InvariantRail() {
  const last = useLab((s) => s.last);
  const result = useLab((s) => s.result);
  const config = useLab((s) => s.config);
  const tick = useLab((s) => s.tick);
  const hover = useLab((s) => s.hover);
  const pinned = useLab((s) => s.pinned);
  const sample = hover ?? pinned;
  const over = tick > 0 ? getSim().overThreshold() : 0;

  return (
    <aside className="flex flex-col gap-4 border-t border-border bg-card p-4 lg:h-full lg:overflow-y-auto lg:border-t-0 lg:border-l">
      <div>
        <div className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Invariants
        </div>
        <ul className="flex flex-col gap-2">
          {INVARIANTS.map((inv) => {
            const st = liveStatus(inv.id);
            return (
              <li
                key={inv.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border bg-secondary px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs text-faint">{inv.id}</div>
                  <div className="text-sm leading-tight">{inv.name}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{inv.hint}</div>
                </div>
                <Badge
                  variant={st === "pass" ? "pass" : st === "fail" ? "fail" : "default"}
                  className="shrink-0"
                >
                  {st === "pending" ? "—" : st.toUpperCase()}
                </Badge>
              </li>
            );
          })}
        </ul>
      </div>

      <Separator />

      <div>
        <div className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Live
        </div>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 font-mono text-xs tabular-nums">
          <Stat k="t" v={String(tick)} />
          <Stat k="‖ψ‖" v={last ? fmt(last.stateNorm, 6) : "—"} />
          <Stat k="C_max" v={last ? fmt(last.C_max, 4) : "—"} />
          <Stat k="det min" v={last ? fmt(last.det_g_min, 5) : "—"} />
          <Stat k="⟨Φ_X⟩" v={last ? fmt(last.pullback_mean, 4) : "—"} />
          <Stat k={'C > λc'} v={String(over)} />
        </dl>
        {result ? (
          <div className="mt-3">
            <Badge variant={result.ok ? "pass" : "fail"}>
              {result.ok ? "PASS P1–P6" : `FAIL ${result.fails.join(" · ")}`}
            </Badge>
          </div>
        ) : null}
      </div>

      <Separator />

      <div>
        <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Site {sample ? `(${sample.i}, ${sample.j})` : "— hover a cell"}
        </div>
        {sample ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-xs tabular-nums">
            <Stat k="g₁₁" v={fmt(sample.g11)} />
            <Stat k="g₁₂" v={fmt(sample.g12)} />
            <Stat k="g₂₂" v={fmt(sample.g22)} />
            <Stat k="det" v={fmt(sample.det)} />
            <Stat k="|ψ|" v={fmt(sample.mag, 5)} />
            <Stat k="arg ψ" v={fmt(sample.phase, 3)} />
            <Stat k="C" v={fmt(sample.C, 4)} />
            <Stat k="Φ" v={fmt(sample.phi, 4)} />
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click a cell to pin. n={config.n}, fiber {fiberDim(config.n)}.
          </p>
        )}
      </div>
    </aside>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-faint">{k}</dt>
      <dd className="text-foreground">{v}</dd>
    </div>
  );
}
