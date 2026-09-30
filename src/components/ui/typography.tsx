import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "display"
  | "heading"
  | "title"
  | "body"
  | "caption"
  | "label";
/** Visual hierarchy is independent of document heading order. */
export function Typography<T extends ElementType = "p">({
  as,
  variant = "body",
  className,
  ...props
}: { as?: T; variant?: TypographyVariant; className?: string } & Omit<
  ComponentPropsWithoutRef<T>,
  "as" | "className"
>) {
  const Component = as ?? "p";
  return (
    <Component
      data-slot="typography"
      data-variant={variant}
      className={cn(`ds-${variant}`, className)}
      {...props}
    />
  );
}
