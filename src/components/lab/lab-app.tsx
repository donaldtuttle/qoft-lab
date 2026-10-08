import { Download, Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { ControlPanel } from "@/components/lab/control-panel";
import { FieldCanvas } from "@/components/lab/field-canvas";
import { InvariantRail } from "@/components/lab/invariant-rail";
import { TelemetryChart } from "@/components/lab/telemetry-chart";
import { ModelDialog } from "@/components/lab/model-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PHASE_FLIP_THRESHOLD, LAB_VERSION } from "@/lib/lattice/sim";
import { LAYERS, useLab } from "@/stores/lab-store";

function Header() {
  const playing = useLab((s) => s.playing);
  const tick = useLab((s) => s.tick);
  const result = useLab((s) => s.result);
  const logLine = useLab((s) => s.logLine);
  const exportCsv = useLab((s) => s.exportCsv);
  const telemetry = useLab((s) => s.telemetry);
  const config = useLab((s) => s.config);

  return (
    <header className="flex flex-col gap-2 border-b border-border bg-card/80 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-2xl leading-none tracking-tight sm:text-3xl">
            Lattice Dynamics Lab
          </h1>
          <p className="text-sm text-muted-foreground">
            Complex lattice simulation · 2D · v{LAB_VERSION}
          </p>
        </div>
        <p className="mt-1 max-w-full truncate font-mono text-xs text-faint" title={logLine}>
          {logLine}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={playing ? "signal" : "default"} className="tabular-nums">
          tick = {tick}
        </Badge>
        {result ? (
          <Badge variant={result.ok ? "pass" : "fail"}>
            {result.ok ? "PASS" : "FAIL"}
          </Badge>
        ) : null}
        {config.phaseFlipEnabled ? (
          <Badge variant="warn">
            phase flip threshold {PHASE_FLIP_THRESHOLD}
          </Badge>
        ) : (
          <Badge>phase-flip off</Badge>
        )}
        <ModelDialog />
        <Button variant="ghost" size="sm" asChild>
          <a href={`https://github.com/${import.meta.env.VITE_REPOSITORY || "donaldtuttle/lattice-dynamics-lab"}`} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          disabled={telemetry.length === 0}
        >
          <Download />
          CSV
        </Button>
      </div>
    </header>
  );
}

function FormulaBar() {
  const layer = useLab((s) => s.layer);
  const label = LAYERS.find((l) => l.id === layer)?.label ?? layer;
  return (
    <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-xs leading-relaxed text-muted-foreground">
          next = normalize(field + neighbor update + matrix coupling)
        </p>
        <p className="mt-0.5 font-mono text-xs leading-relaxed text-faint">
          Relative power = site power / (mean power + 1e-12)
        </p>
        <p className="mt-1 text-xs text-faint">
          Ellipses show matrices; line direction shows phase; cell borders mark high relative power.
        </p>
      </div>
      <p className="text-xs text-faint">{label}</p>
    </div>
  );
}

function usePlayback() {
  const playing = useLab((s) => s.playing);
  const speed = useLab((s) => s.speed);

  useEffect(() => {
    if (!playing) return;
    let id = 0;
    let acc = 0;
    let last = performance.now();
    const ms = 1000 / Math.max(1, speed);
    const loop = (now: number) => {
      acc += now - last;
      last = now;
      let steps = 0;
      const step = useLab.getState().step;
      while (acc >= ms && steps < 8) {
        acc -= ms;
        step();
        steps += 1;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [playing, speed]);
}

function useHotkeys() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const st = useLab.getState();
      if (e.code === "Space") {
        e.preventDefault();
        st.setPlaying(!st.playing);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        st.setPlaying(false);
        st.step();
      } else if (e.key === "r" || e.key === "R") {
        st.reset();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function MobilePlay() {
  const playing = useLab((s) => s.playing);
  const setPlaying = useLab((s) => s.setPlaying);
  const step = useLab((s) => s.step);
  const reset = useLab((s) => s.reset);
  const checkRun = useLab((s) => s.checkRun);
  return (
    <div className="flex flex-col gap-2 lg:hidden">
      <div className="flex gap-2">
        <Button
          className="h-11 flex-1"
          variant={playing ? "secondary" : "default"}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause /> : <Play />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          className="h-11"
          variant="secondary"
          onClick={() => {
            setPlaying(false);
            step();
          }}
        >
          Step
        </Button>
        <Button className="h-11" variant="secondary" onClick={reset}>
          Reset
        </Button>
      </div>
      <Button variant="signal" className="h-11 w-full" onClick={checkRun}>
        Check run · 32 ticks
      </Button>
    </div>
  );
}

export function LabApp() {
  const ready = useLab((s) => s.ready);
  const init = useLab((s) => s.init);

  useEffect(() => {
    if (!ready) init();
  }, [ready, init]);

  usePlayback();
  useHotkeys();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <Header />
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)_18rem] lg:grid-rows-[minmax(0,1fr)]">
          <ControlPanel />
          <main className="order-first flex min-h-0 flex-col gap-3 bg-background p-4 lg:order-none">
            <MobilePlay />
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <FieldCanvas />
            </div>
            <FormulaBar />
          </main>
          <InvariantRail />
        </div>
        <TelemetryChart />
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
              color: "var(--color-foreground)",
            },
          }}
        />
      </div>
    </TooltipProvider>
  );
}
