import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> & {
  value: number[];
  onValueChange: (value: number[]) => void;
};

export function Slider({ className, value, onValueChange, min = 0, max = 100, step = 1, ...props }: Props) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0] ?? 0}
      onChange={(e) => onValueChange([Number(e.target.value)])}
      suppressHydrationWarning
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-signal",
        className,
      )}
      {...props}
    />
  );
}
