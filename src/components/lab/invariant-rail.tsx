import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { symmetricComponentCount, relativePowerCheckOk } from "@/lib/lattice/sim";
import { fmt } from "@/lib/utils";
import { getSim, useLab } from "@/stores/lab-store";

const INVARIANTS = [
  {
    id: "P1",
    name: "site mapping",
    hint: "Stored grid coordinates match each matrix slot.",
  },
  {
    id: "P2",
    name: "positive determinant",
    hint: "Reject candidate matrix updates with determinant at or below zero.",
  },
  {
    id: "P3",
    name: "3 matrix components",
    hint: "A symmetric 2x2 matrix stores m11, m12, and m22.",
  },
  {
    id: "P4",
    name: "relative power",
    hint: "Finite relative power and a numerical formula check.",
  },
  {
    id: "P5",
    name: "deterministic",
    hint: "Same seed and configuration reproduce telemetry in this runtime.",
  },
  {
    id: "P6",
    name: "disabled gate",
    hint: "When the gate is disabled, no phase-flip events occur.",
  },
] as const;

function liveStatus(id: string): "pass" | "fail" | "pending" | "not-applicable" {
  const { last, telemetry, result, config } = useLab.getState();
  if (id === "P6" && config.phaseFlipEnabled) return "not-applicable";
  if (result) {
    const map: Record<string, string> = {
      P1: "P1 site mapping",
      P2: "P2 determinant",
      P3: "P3 matrix components",
      P4: "P4",
      P5: "P5 deterministic",
      P6: "P6 phase flip disabled",
    };
    const key = map[id] ?? id;
    const hit = result.fails.some((f) => f.startsWith(key) || f.includes(id));
    if (id === "P5") return result.p5 ? "pass" : "fail";
    return hit ? "fail" : "pass";
  }
  if (!last) return "pending";
  if (id === "P1") return last.siteMappingOk === 1 ? "pass" : "fail";
  if (id === "P2") return last.minDeterminant > 0 ? "pass" : "fail";
  if (id === "P3") return symmetricComponentCount(config.n) === 3 ? "pass" : "fail";
  if (id === "P4")
    return Number.isFinite(last.maxRelativePower) && relativePowerCheckOk() ? "pass" : "fail";
  if (id === "P5") return "pending";
  if (id === "P6") {
    if (config.phaseFlipEnabled) return "pending";
    return telemetry.every((r) => r.phaseFlipApplied === 0) ? "pass" : "fail";
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
                  {st === "pending" ? "..." : st === "not-applicable" ? "N/A" : st.toUpperCase()}
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
          <Stat k="tick" v={String(tick)} />
          <Stat k="Field norm" v={last ? fmt(last.stateNorm, 6) : "..."} />
          <Stat k="Peak power" v={last ? fmt(last.maxRelativePower, 4) : "..."} />
          <Stat k="det min" v={last ? fmt(last.minDeterminant, 5) : "..."} />
          <Stat k="Mean coupling" v={last ? fmt(last.meanMatrixCoupling, 4) : "..."} />
          <Stat k={'Above threshold'} v={String(over)} />
        </dl>
        {result ? (
          <div className="mt-3">
            <Badge variant={result.ok ? "pass" : "fail"}>
              {result.ok ? "PASS P1-P6" : `FAIL ${result.fails.join(" · ")}`}
            </Badge>
          </div>
        ) : null}
      </div>

      <Separator />

      <div>
        <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Site {sample ? `(${sample.i}, ${sample.j})` : "... hover a cell"}
        </div>
        {sample ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-xs tabular-nums">
            <Stat k="m11" v={fmt(sample.m11)} />
            <Stat k="m12" v={fmt(sample.m12)} />
            <Stat k="m22" v={fmt(sample.m22)} />
            <Stat k="det" v={fmt(sample.det)} />
            <Stat k="Magnitude" v={fmt(sample.mag, 5)} />
            <Stat k="Phase" v={fmt(sample.phase, 3)} />
            <Stat k="Rel. power" v={fmt(sample.relativePower, 4)} />
            <Stat k="Coupling" v={fmt(sample.couplingField, 4)} />
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">
            Click a cell to pin. n={config.n}, matrix components {symmetricComponentCount(config.n)}.
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
