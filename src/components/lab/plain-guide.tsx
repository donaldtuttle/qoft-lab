import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LAB_VERSION, LAMBDA_C } from "@/lib/qoft/sim";

export function PlainGuide() {
  const buildSha = import.meta.env.VITE_GIT_SHA as string | undefined;
  const repo = "https://github.com/donaldtuttle/qoft-lab";
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="sm">How it works</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lattice Dynamics Lab</DialogTitle>
          <DialogDescription>A complex field coupled to local geometry on a repeating 2D grid.</DialogDescription>
        </DialogHeader>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">What each cell stores</h3>
          <p>A complex number has a real part and an imaginary part. Together they give the field its amplitude and phase. Separately, a symmetric 2 by 2 metric matrix describes local geometry using three numbers.</p>
          <p>Opposite grid edges connect. Each cell interacts with its four neighbors.</p>
        </section>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">What happens each step</h3>
          <ol className="list-decimal space-y-2 pl-5">
            <li>Perturb each metric matrix with seeded random values. Reject a proposed update if its determinant is not positive.</li>
            <li>Calculate a scalar geometry signal from each matrix: trace plus 0.1 times the logarithm of its determinant.</li>
            <li>Add neighbor coupling and geometry coupling to the current field, then normalize the whole field to approximately unit norm.</li>
            <li>If phase flips are enabled, multiply the field by negative one at cells whose relative intensity exceeds {LAMBDA_C}.</li>
          </ol>
          <pre className="overflow-x-auto rounded-lg bg-secondary p-3 text-xs leading-relaxed">{`neighbor_difference = average_of_four_neighbors - field
neighbor_update = neighbor_coupling * neighbor_difference
geometry_update = geometry_coupling * geometry_signal * field
next_field = normalize((field + neighbor_update) + geometry_update)
relative_intensity = amplitude_squared / (mean_amplitude_squared + 1e-12)`}</pre>
          <p>The order of additions above matches the engine. Normalization divides by the field norm plus 1e-12.</p>
        </section>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">Read the image</h3>
          <p>Ellipses show the local metric. Line direction shows phase; line length shows amplitude relative to the strongest cell. Outlined cells exceed the intensity threshold. The outline is solid with flips enabled and dashed with flips disabled.</p>
          <p>Layer colors use display scaling. They are useful for patterns, but numerical comparisons should use the inspector and CSV.</p>
        </section>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">Try a controlled comparison</h3>
          <p>Load the reference settings, run the 32 step check, and download the CSV. Enable the phase flip and run the check again. Each check restarts from the selected seed. Keep every other setting the same.</p>
          <p>Seed and grid changes restart the simulation. Couplings and metric variation can change during playback; reset before making a controlled comparison. Playback speed only changes how quickly steps are displayed.</p>
          <p>The field has no memory store or trained model. The original self-projection operation is an identity copy.</p>
        </section>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">Measurements and checks</h3>
          <p>Relative intensity compares each cell's squared amplitude with the grid mean. Neighbor difference norm measures how far the field differs from its four-neighbor average after the step. It excludes the coupling weights and geometry contribution.</p>
          <p>The phase flip event is a yes/no flag for the whole step, not a count of flipped cells. Cells above threshold is a separate count, shown even when flips are off.</p>
          <p>P1 through P6 check grid pairing, positive determinants, matrix component count, limited intensity-rule guards, repeatability, and absence of flips when disabled. P6 is not applicable while flips are enabled. A passing check establishes software behavior within that check's scope.</p>
          <p>This is an experimental numerical model. A reversible phase flip does not demonstrate physical measurement collapse. The project remains DEVELOP and does not establish QOFT, consciousness, or new physics.</p>
        </section>
        <section className="space-y-2 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">Export and provenance</h3>
          <p>Plain CSV uses descriptive headers. Step index starts at zero for the first completed step. The chart and export retain the most recent 256 steps during playback; the check exports all 32 steps. CSV does not record a history of slider edits.</p>
          <p>Plain edition 0.1.0, shared engine {LAB_VERSION}. Both editions call the same numerical code and preserve its random sequence, arithmetic order, and threshold.</p>
          <p>Build: {buildSha ? <a className="text-signal underline" href={`${repo}/commit/${buildSha}`}>{buildSha.slice(0, 12)}</a> : "local / unpinned"}.</p>
          <p><a className="text-signal underline" href={`${repo}/blob/${buildSha || "main"}/docs/PLAIN_LANGUAGE.md`}>Terminology crosswalk</a></p>
        </section>
      </DialogContent>
    </Dialog>
  );
}
