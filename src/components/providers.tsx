"use client";

import { MotionConfig } from "motion/react";

/** Global Motion config — respects the user's reduced-motion preference. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
