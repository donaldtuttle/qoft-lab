import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary text-muted-foreground",
        pass: "border-pass/30 bg-pass/15 text-pass",
        fail: "border-destructive/30 bg-destructive/15 text-destructive",
        warn: "border-warn/30 bg-warn/15 text-warn",
        signal: "border-signal/30 bg-signal/15 text-signal",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
