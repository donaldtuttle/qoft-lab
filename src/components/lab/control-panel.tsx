import { Pause, Play, RotateCcw, SkipForward, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { PHASE_FLIP_THRESHOLD } from "@/lib/lattice/sim";
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
  const config = useLab((s) => s.config);
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);
  const layer = useLab((s) => s.layer);
  const patch = useLab((s) => s.patchConfig);
  const reset = useLab((s) => s.reset);
  const step = useLab((s) => s.step);
  const checkRun = useLab((s) => s.checkRun);
  const setPlaying = useLab((s) => s.setPlaying);
  const setSpeed = useLab((s) => s.setSpeed);
  const setLayer = useLab((s) => s.setLayer);
  const applyReference = useLab((s) => s.applyReference);

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
          <Button variant="signal" onClick={checkRun} className="col-span-2">
            Check run · 32 ticks
          </Button>
        </div>
      </div>

      <Row label="Speed" value={`${speed} ticks/s`}>
        <Slider
          min={1}
          max={48}
          step={1}
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
          {LAYERS.map((l) => (
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

      <div className="flex flex-col gap-4">
        <Row label="Seed" value={String(config.seed)}>
          <Slider
            min={1}
            max={99}
            step={1}
            value={[config.seed]}
            onValueChange={(v) => patch({ seed: v[0] ?? 7 })}
          />
        </Row>
        <Row label="Grid" value={`${config.grid}×${config.grid}`}>
          <div className="grid grid-cols-4 gap-1">
            {[8, 16, 24, 32].map((gridSize) => (
              <Button
                key={gridSize}
                size="sm"
                variant={config.grid === gridSize ? "default" : "secondary"}
                onClick={() => patch({ grid: gridSize })}
              >
                {gridSize}
              </Button>
            ))}
          </div>
        </Row>
        <Row label="Neighbor coupling" value={fmt(config.neighborWeight, 3)}>
          <Slider
            min={0}
            max={0.5}
            step={0.01}
            value={[config.neighborWeight]}
            onValueChange={(v) => patch({ neighborWeight: v[0] ?? 0.15 }, false)}
          />
        </Row>
        <Row label="Matrix coupling" value={fmt(config.matrixWeight, 3)}>
          <Slider
            min={0}
            max={0.2}
            step={0.005}
            value={[config.matrixWeight]}
            onValueChange={(v) => patch({ matrixWeight: v[0] ?? 0.05 }, false)}
          />
        </Row>
        <Row label="Matrix step size" value={fmt(config.matrixStepSize, 3)}>
          <Slider
            min={0}
            max={0.08}
            step={0.005}
            value={[config.matrixStepSize]}
            onValueChange={(v) => patch({ matrixStepSize: v[0] ?? 0.02 }, false)}
          />
        </Row>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-3 py-2.5">
          <div>
            <div className="text-sm font-medium">Phase-flip gate</div>
            <div className="text-xs leading-snug text-muted-foreground">
              Relative power {">"} {PHASE_FLIP_THRESHOLD}; reversible sign change
            </div>
          </div>
          <Switch
            checked={config.phaseFlipEnabled}
            onCheckedChange={(v) => patch({ phaseFlipEnabled: v }, false)}
            aria-label="Toggle phase-flip gate"
          />
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={applyReference} className="self-start px-0">
        Load reference defaults
      </Button>
    </aside>
  );
}
