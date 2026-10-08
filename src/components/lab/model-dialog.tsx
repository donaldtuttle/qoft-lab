import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LAB_VERSION, PHASE_FLIP_THRESHOLD } from "@/lib/lattice/sim";

const REPO = `https://github.com/${import.meta.env.VITE_REPOSITORY || "donaldtuttle/lattice-dynamics-lab"}`;

export function ModelDialog() {
  const buildSha = import.meta.env.VITE_GIT_SHA as string | undefined;
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="sm">Model</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>A complex lattice simulation</DialogTitle>
          <DialogDescription>
            A reproducible numerical sandbox for inspecting local updates, global
            normalization, and a reversible phase intervention.
          </DialogDescription>
        </DialogHeader>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">State</h3>
          <p>Each grid site stores one complex number and a symmetric 2x2 matrix.
            The complex numbers use real and imaginary arrays. Each matrix stores
            three independent components. Grid boundaries wrap around.</p>
        </section>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">Each tick</h3>
          <ol className="list-decimal space-y-2 pl-4">
            <li>Add a seeded, traceless symmetric perturbation to each matrix.
              Reject candidates with a nonpositive determinant.</li>
            <li>Compute a scalar coupling from the matrix trace and log determinant.</li>
            <li>Add the weighted neighbor residual and matrix coupling to the field,
              then normalize using its global L2 norm plus a small stabilizer.</li>
            <li>If enabled, negate field values whose relative power exceeds {PHASE_FLIP_THRESHOLD}.
              This preserves site power and is reversible.</li>
          </ol>
        </section>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">What the checks establish</h3>
          <p>P1-P6 check stored coordinates, positive determinants, matrix storage,
            relative-power calculation, deterministic replay, and a disabled phase-flip gate.
            Passing these checks verifies implementation properties. Task performance
            and physical predictive accuracy have not been evaluated.</p>
          <p>The Python reference uses NumPy PCG64; the browser uses sfc32.
            They implement the same update structure with different random trajectories.</p>
        </section>
        <div className="space-y-2 border-t border-border pt-3 text-xs text-faint">
          <p>Version {LAB_VERSION}. Telemetry schema 2.</p>
          <p>Build: {buildSha ? <a className="text-signal underline" href={`${REPO}/commit/${buildSha}`}>{buildSha.slice(0, 12)}</a> : "local or unpinned"}</p>
          <p className="flex flex-wrap gap-4">
            <a className="text-signal underline" href={`${REPO}/blob/${buildSha || "main"}/docs/MODEL.md`}>Model contract</a>
            <a className="text-signal underline" href={`${import.meta.env.BASE_URL}lattice_reference.py`} download>Python reference</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
