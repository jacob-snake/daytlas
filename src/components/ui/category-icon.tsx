import { Icon } from "@/components/icon";
import type { IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";
export function CategoryIcon({
  icon,
  color,
  small = false,
}: {
  icon: IconSvgElement;
  color: string;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        small ? "size-8" : "size-12",
      )}
      style={{
        color,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      <Icon icon={icon} className={small ? "size-4" : "size-6"} />
    </span>
  );
}
