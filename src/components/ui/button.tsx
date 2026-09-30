"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

/** Homepage is the reference. Legacy names remain aliases during migration. */
const buttonVariants = cva("ds-button group/button", {
  variants: {
    variant: {
      default: "ds-button--primary",
      primary: "ds-button--primary",
      outline: "ds-button--secondary",
      secondary: "ds-button--secondary",
      ghost: "ds-button--ghost",
      destructive: "ds-button--destructive",
      link: "ds-button--link",
    },
    size: {
      default: "ds-button--md",
      sm: "ds-button--sm",
      xs: "ds-button--xs",
      lg: "ds-button--lg",
      icon: "ds-button--icon",
      "icon-xs": "ds-button--icon-xs",
      "icon-sm": "ds-button--icon-sm",
      "icon-lg": "ds-button--icon-lg",
    },
  },
  defaultVariants: { variant: "default", size: "default" },
});

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  onClick,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const classes = cn(buttonVariants({ variant, size }), className);
  const shared = {
    "data-slot": "button",
    "data-variant": variant,
    "data-size": size,
    "aria-busy": loading || undefined,
    className: classes,
  };
  if (asChild) {
    return (
      <Slot.Root
        {...props}
        {...shared}
        aria-disabled={disabled || loading || undefined}
        onClickCapture={(event: React.MouseEvent<HTMLButtonElement>) => {
          if (disabled || loading) { event.preventDefault(); event.stopPropagation(); }
          else props.onClickCapture?.(event);
        }}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          if (disabled || loading) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClick?.(event);
        }}
      >
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      {...props}
      {...shared}
      type={type ?? "button"}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? (
        <>
          <span className="ds-button-label">{children}</span>
          <span className="ds-button-spinner" aria-hidden="true" />
        </>
      ) : (
        children
      )}
    </button>
  );
}
export { Button, buttonVariants };
