import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LAB_VERSION, LAMBDA_C, REALIZATION } from "@/lib/qoft/sim";

export function TheoryDialog() {
  const buildSha = import.meta.env.VITE_GIT_SHA;
  const hostUrl = new URL(import.meta.env.BASE_URL, window.location.origin).href;

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

        <section className="flex flex-col gap-2 rounded-lg border border-border bg-secondary px-3 py-2.5">
          <h3 className="text-sm font-medium">Classification</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-faint">GU terms</dt>
            <dd className="text-muted-foreground">analogy only</dd>
            <dt className="text-faint">QOFT code</dt>
            <dd className="text-muted-foreground">
              {REALIZATION.status} {REALIZATION.kind}
            </dd>
            <dt className="text-faint">Phase flip</dt>
            <dd className="text-muted-foreground">experiment-only intervention</dd>
            <dt className="text-faint">Canonical weight</dt>
            <dd className="text-muted-foreground">{REALIZATION.canonicalWeight}</dd>
            <dt className="text-faint">Host pin</dt>
            <dd className="break-all text-muted-foreground">
              {buildSha ? (
                <a
                  href={`https://github.com/donaldtuttle/qoft-lab/commit/${buildSha}`}
                  className="text-signal underline-offset-2 hover:underline"
                >
                  {buildSha}
                </a>
              ) : "UNPINNED — local / custom build"}
            </dd>
            <dt className="text-faint">Host URL</dt>
            <dd className="break-all text-muted-foreground">
              {hostUrl}
            </dd>
            <dt className="text-faint">Engine version</dt>
            <dd className="text-muted-foreground">
              v{LAB_VERSION}
            </dd>
          </dl>
          <p className="text-xs text-faint">v{LAB_VERSION} · see docs/TYPED_REALIZATION.md</p>
        </section>

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
          <h3 className="text-sm font-medium">Realization</h3>
          <p className="font-mono text-xs leading-relaxed text-muted-foreground">
            Ξtoy(ψ) = Π*toy(ψ) ⊕toy Γtoy(ψ; g)
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Canonical Πᴽ : Ψ × Ctx × M → Ψᴽ. This toy sets Π*toy : Ψtoy → Ψtoy
            with ctx = (g, α, β, L) and M unused. encode_A = decode_B = id.
            Π*toy is the identity — not a hidden self-model. ⊕toy is
            normalize(ψ* + γ). Γtoy is α(avg − ψ) + β Φ_X ⊙ ψ. Internal addition
            belongs inside ⊕toy. The IEEE tick is exact vs v0.1.0; abstract
            fuse(Π, Γtoy) is a bounded 1e-15 approximation.
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
              QOFT tick: ψ ← Ξtoy(ψ; g). Same arithmetic as the original normalize(ψ +
              α Γ_nbr(ψ) + β Φ_X · ψ). Γ_nbr is a neighbor average minus ψ — not Shiab.
            </li>
            <li>
              Optional phase-flip intervention: C = |ψ|² / (ρ + ε). If C {">"} λ_c ={" "}
              {LAMBDA_C}, multiply those sites by −1. This preserves |ψ|² and is
              reversible; it is not a realization of canonical Λψ. λ_c is a toy/local
              threshold, not a QOFT universal constant.
            </li>
          </ol>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Model constraints</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Y = ψ · Shiab in C · literal 14 in C · G = Y · retrieve-as-ID. These are
            design bans, not an exhaustive runtime enumerator. P4 mechanically checks
            that C is a function of ψ only.
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
            href={`${import.meta.env.BASE_URL}gu_qoft_toy.py`}
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
