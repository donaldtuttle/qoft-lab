import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, fmt } from "@/lib/utils";
import { useLab } from "@/stores/lab-store";

const SERIES = [
  { key: "C_max", label: "C_max", color: "var(--color-signal)" },
  { key: "det_g_min", label: "det g min", color: "var(--color-pass)" },
  { key: "pullback_mean", label: "⟨Φ_X⟩", color: "var(--color-warn)" },
  { key: "reflexNorm", label: "‖Γψ‖", color: "var(--color-paper)" },
] as const;

type SeriesKey = (typeof SERIES)[number]["key"];

export function TelemetryChart() {
  const telemetry = useLab((s) => s.telemetry);
  const [on, setOn] = useState<Record<SeriesKey, boolean>>({
    C_max: true,
    det_g_min: true,
    pullback_mean: false,
    reflexNorm: false,
  });

  return (
    <section className="flex h-48 flex-col border-t border-border bg-card px-4 py-3 md:h-52">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Telemetry
        </h2>
        <div className="flex flex-wrap gap-1">
          {SERIES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setOn((p) => ({ ...p, [s.key]: !p[s.key] }))}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors duration-150",
                on[s.key]
                  ? "border-border bg-secondary text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-accent",
              )}
            >
              <span
                className="mr-1.5 inline-block size-1.5 rounded-full"
                style={{ background: on[s.key] ? s.color : "var(--color-faint)" }}
              />
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {telemetry.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Step or run to record traces.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={telemetry} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "var(--color-border)" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
                tickFormatter={(v: number) => fmt(v, 2)}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--color-popover-foreground)",
                }}
                formatter={(value, name) => [fmt(Number(value)), String(name)]}
                labelFormatter={(l) => `t = ${l}`}
              />
              {SERIES.map((s) =>
                on[s.key] ? (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={s.color}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : null,
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
