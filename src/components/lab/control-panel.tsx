import { usePlainLanguage } from "./edition";
import { PLAIN_LAYERS } from "@/lib/plain-language";
import { Pause, Play, RotateCcw, SkipForward, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { LAMBDA_C } from "@/lib/qoft/sim";
import { fmt } from "@/lib/utils";
import { LAYERS, useLab } from "@/stores/lab-store";

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="font-mono text-xs tabular-nums text-foreground">{value}</span>
      </span>
      {children}
    </div>
  );
}

export function ControlPanel() {
  const plain = usePlainLanguage();
  const config = useLab((s) => s.config);
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const layer = useLab((s) => s.layer);
  const patch = useLab((s) => s.patchConfig);
  const reset = useLab((s) => s.reset);
  const step = useLab((s) => s.step);
  const toyRun = useLab((s) => s.toyRun);
  const setPlaying = useLab((s) => s.setPlaying);
  const setSpeed = useLab((s) => s.setSpeed);
  const setLayer = useLab((s) => s.setLayer);
  const applyV0 = useLab((s) => s.applyV0);

  return (
    <aside className="flex flex-col gap-5 border-b border-border bg-card p-4 lg:h-full lg:overflow-y-auto lg:border-r lg:border-b-0">
      <div className="hidden lg:block">
        <div className="mb-3 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <SlidersHorizontal className="size-3.5" />
          Run
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={playing ? "secondary" : "default"}
            onClick={() => setPlaying(!playing)}
            className="col-span-2 h-11"
          >
            {playing ? <Pause /> : <Play />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPlaying(false);
              step();
            }}
          >
            <SkipForward />
            Step
          </Button>
          <Button variant="secondary" onClick={reset}>
            <RotateCcw />
            Reset
          </Button>
          <Button variant="signal" onClick={toyRun} className="col-span-2">
            {plain ? "Run 32 step check" : "Toy run · 32 ticks"}
          </Button>
        </div>
      </div>

      <Row label="Speed" value={`${speed} ticks/s`}>
        <Slider
          min={1}
          max={48}
          step={1}
          aria-label="Playback speed"
          value={[speed]}
          onValueChange={(v) => setSpeed(v[0] ?? 12)}
        />
      </Row>

      <Separator />

      <div>
        <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Layer
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-secondary p-1">
          {(plain ? PLAIN_LAYERS : LAYERS).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLayer(l.id)}
              className={
                layer === l.id
                  ? "rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
                  : "rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />
      {plain && <p className="text-xs text-muted-foreground">Seed and grid changes restart. Couplings change the current run. Reset before comparing settings.</p>}

      <div className="flex flex-col gap-4">
        <Row label="Seed" value={String(config.seed)}>
          <Slider
            min={1}
            max={99}
            step={1}
            aria-label="Seed"
            value={[config.seed]}
            onValueChange={(v) => patch({ seed: v[0] ?? 7 })}
          />
        </Row>
        <Row label="Grid" value={`${config.grid}×${config.grid}`}>
          <div className="grid grid-cols-4 gap-1">
            {[8, 16, 24, 32].map((g) => (
              <Button
                key={g}
                size="sm"
                variant={config.grid === g ? "default" : "secondary"}
                onClick={() => patch({ grid: g })}
              >
                {g}
              </Button>
            ))}
          </div>
        </Row>
        <Row label={plain ? "Neighbor coupling" : "α  fusion"} value={fmt(config.alpha, 3)}>
          <Slider
            min={0}
            max={0.5}
            step={0.01}
            aria-label="Neighbor coupling"
            value={[config.alpha]}
            onValueChange={(v) => patch({ alpha: v[0] ?? 0.15 }, false)}
          />
        </Row>
        <Row label={plain ? "Geometry coupling" : "β  pullback"} value={fmt(config.beta, 3)}>
          <Slider
            min={0}
            max={0.2}
            step={0.005}
            aria-label="Geometry coupling"
            value={[config.beta]}
            onValueChange={(v) => patch({ beta: v[0] ?? 0.05 }, false)}
          />
        </Row>
        <Row label={plain ? "Metric variation" : "ε  metric"} value={fmt(config.epsilonG, 3)}>
          <Slider
            min={0}
            max={0.08}
            step={0.005}
            aria-label="Metric variation"
            value={[config.epsilonG]}
            onValueChange={(v) => patch({ epsilonG: v[0] ?? 0.02 }, false)}
          />
        </Row>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-3 py-2.5">
          <div>
            <div className="text-sm font-medium">Phase-flip gate</div>
            <div className="text-xs leading-snug text-muted-foreground">
              {plain ? `Reverse phase when relative intensity exceeds ${LAMBDA_C}. Reversible.` : <>Toy intervention · C {">"} λ<sub>c</sub> = {LAMBDA_C} · × −1, reversible</>}
            </div>
          </div>
          <Switch
            checked={config.collapse}
            onCheckedChange={(v) => patch({ collapse: v }, false)}
            aria-label="Toggle phase-flip gate"
          />
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={applyV0} className="self-start px-0">
        {plain ? "Load reference settings" : "Load v0 defaults"}
      </Button>
    </aside>
  );
}
