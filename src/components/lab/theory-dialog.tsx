import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function TheoryDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Contract
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>A calculus toy, not a TOE</DialogTitle>
          <DialogDescription>
            Faithful in-browser port of the n=2 GU×QOFT tick contract. Geometric Unity
            names are analogy only.
          </DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Spaces</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            X is the discrete base (the grid). Y = Met(X) is the fiber of symmetric
            bilinear forms at each site — three independent components for n=2.
            ι stores g at x; π forgets g and returns x. ψ is an observer field on X,
            independent of Y.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Each tick</h3>
          <ol className="list-decimal space-y-1.5 pl-4 text-sm leading-relaxed text-muted-foreground">
            <li>
              Metric step on ι = g: g ← g + ε σ with σ a symmetric 2-tensor (mild
              traceless bias). Reject any site with det ≤ 0.
            </li>
            <li>
              Pullback toy: Φ_X = Φ_Y(x, g_t(x)) = tr(g) + 0.1 log det(g).
            </li>
            <li>
              QOFT tick on ψ only: ψ ← normalize(ψ + α Γ(ψ) + β Φ_X · ψ), where Γ is
              a neighbor average minus ψ — a typed fusion stand-in, not Shiab.
            </li>
            <li>
              Optional collapse on ψ: C = |ψ|² / (ρ + ε). If C {">"} λ_c = 1.67, flip
              local phase (multiply by −1). The gate does not see dim(Y), 14, or Shiab.
            </li>
          </ol>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Banned identifications</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Y = ψ · Shiab in C · literal 14 in C · G = Y · retrieve-as-ID. The run
            fails if those enter the dynamics.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Out of scope</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Shiab, G = H ⋉ N, spinors, U(64,64), and n=4 are undefined here. Fiber
            dimension is n(n+1)/2 = 3, not 14.
          </p>
        </section>

        <p className="text-xs text-faint">
          Same seed is deterministic in this engine (P5). It is not bit-identical to
          the numpy PCG64 original.{" "}
          <a
            href="/gu_qoft_toy.py"
            download
            className="text-signal underline-offset-2 hover:underline"
          >
            Original Python toy
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
