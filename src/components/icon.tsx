"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

/**
 * Thin wrapper so call sites read `<Icon icon={CoffeeIcon} />` uniformly and
 * pick up our default stroke/size without repeating props everywhere.
 */
export function Icon({
  icon,
  className,
  size = 20,
  strokeWidth = 1.8,
  ...props
}: {
  icon: IconSvgElement;
  className?: string;
  size?: number;
  strokeWidth?: number;
} & React.ComponentProps<typeof HugeiconsIcon>) {
  return (
    <HugeiconsIcon
      icon={icon}
      size={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
}
