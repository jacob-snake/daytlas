"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
export function FloatingControls({
  children,
  controls,
  ready = true,
}: {
  children: ReactNode;
  controls: ReactNode;
  ready?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const [away, setAway] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setAway(!entry.isIntersecting && entry.boundingClientRect.bottom < 0),
    );
    if (panel.current) observer.observe(panel.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const main = panel.current?.closest("main");
    if (!main) return;
    const update = () =>
      main.style.setProperty(
        "--trend-toolbar-height",
        ready && away
          ? `${(toolbar.current?.offsetHeight ?? 68) + 12}px`
          : "0px",
      );
    const observer = new ResizeObserver(update);
    if (toolbar.current) observer.observe(toolbar.current);
    update();
    return () => {
      observer.disconnect();
      main.style.setProperty("--trend-toolbar-height", "0px");
    };
  }, [ready, away]);
  return (
    <>
      <div ref={panel}>{children}</div>
      {ready && away && (
        <div
          ref={toolbar}
          style={{
            transform:
              "translateY(calc(var(--app-header-offset, 0px) + var(--trend-navigation-height, 0px)))",
          }}
          className="fixed inset-x-4 top-3 !mt-0 z-30 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-[var(--ds-radius-card)] border border-border/70 bg-background p-3 shadow-lg motion-safe:transition-transform motion-safe:duration-[220ms] motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          {controls}
        </div>
      )}
    </>
  );
}
