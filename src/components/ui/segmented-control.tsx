"use client";
import { ToggleGroup } from "radix-ui";
import { cn } from "@/lib/utils";
/** A single-choice control; unlike tabs it does not claim nonexistent tab panels. */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
      aria-label={label}
      className={cn("ds-segmented", className)}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className="ds-segment"
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
