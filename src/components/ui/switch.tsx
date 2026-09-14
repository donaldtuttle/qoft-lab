import { cn } from "@/lib/utils";

type Props = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  "aria-label"?: string;
};

export function Switch({ checked, onCheckedChange, className, ...props }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-signal" : "bg-secondary",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "block size-5 rounded-full bg-primary transition-transform duration-150 ease-out",
          checked ? "translate-x-5 bg-signal-fg" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
