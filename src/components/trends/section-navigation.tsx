"use client";
import "./section-navigation.css";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import type { SectionDef } from "./trend-section";

type NavigationSection = Pick<SectionDef, "id" | "title" | "icon" | "color">;
export function SectionNavigation({
  sections,
  label = "Trend sections",
  prefix = "trend",
}: {
  sections: NavigationSection[];
  label?: string;
  prefix?: string;
}) {
  const rail = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({
    active: sections[0].id,
    progress: 0,
    top: 112,
  });
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const main = document.querySelector("main");
      const parent = rail.current?.parentElement;
      if (parent && rail.current)
        rail.current.style.setProperty(
          "--rail-left",
          `${Math.max(2, parent.getBoundingClientRect().left - 47)}px`,
        );
      const styles = main ? getComputedStyle(main) : null;
      const navigationHeight =
        window.innerWidth < 900 ? (rail.current?.offsetHeight ?? 54) + 12 : 0;
      if (
        main &&
        styles?.getPropertyValue("--trend-navigation-height") !==
          `${navigationHeight}px`
      )
        main.style.setProperty(
          "--trend-navigation-height",
          `${navigationHeight}px`,
        );
      const top =
        12 +
        parseFloat(styles?.getPropertyValue("--app-header-offset") || "0") +
        parseFloat(styles?.getPropertyValue("--trend-toolbar-height") || "0");
      const offset = top + navigationHeight + 8;
      const nodes = sections
        .map((s) => ({
          id: s.id,
          node: document.getElementById(`${prefix}-${s.id}`),
        }))
        .filter((s) => s.node);
      const current =
        [...nodes]
          .reverse()
          .find((s) => s.node!.getBoundingClientRect().top <= offset) ??
        nodes[0];
      if (!current) return;
      const rect = current.node!.getBoundingClientRect();
      const progress = Math.max(
        0,
        Math.min(1, (offset - rect.top) / Math.max(1, rect.height)),
      );
      const atEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;
      setPosition({
        active: current.id,
        progress: atEnd && current.id === sections.at(-1)?.id ? 1 : progress,
        top: offset,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    if (rail.current) observer.observe(rail.current);
    const headerObserver = new MutationObserver(schedule);
    const headerNode = document.querySelector("main");
    if (headerNode)
      headerObserver.observe(headerNode, {
        attributes: true,
        attributeFilter: ["style"],
      });
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      headerObserver.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      headerNode?.style.removeProperty("--trend-navigation-height");
    };
  }, [sections, prefix]);
  return (
    <aside
      ref={rail}
      className="trend-rail sticky z-20"
      style={{
        top: 12,
        transform: "translateY(var(--app-header-offset, 0px))",
      }}
    >
      <nav aria-label={label} className="trend-rail-nav">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${prefix}-${s.id}`}
            aria-current={position.active === s.id ? "location" : undefined}
            onClick={(e) => {
              e.preventDefault();
              const node = document.getElementById(`${prefix}-${s.id}`);
              if (node) {
                const offset = position.top;
                window.scrollTo({
                  top:
                    window.scrollY + node.getBoundingClientRect().top - offset,
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                });
              }
            }}
            className="trend-rail-link group"
            aria-label={s.id === "readiness" ? "Readiness" : s.title}
            style={{ "--section-color": s.color } as React.CSSProperties}
          >
            <Icon icon={s.icon} className="size-5 shrink-0" />
            <span className="trend-rail-label">
              {s.id === "readiness" ? "Readiness" : s.title}
            </span>
            <span className="trend-rail-track" aria-hidden="true">
              <span
                style={
                  {
                    "--progress": `${position.active === s.id ? Math.max(3, position.progress * 100) : sections.findIndex((x) => x.id === s.id) < sections.findIndex((x) => x.id === position.active) ? 100 : 0}%`,
                  } as React.CSSProperties
                }
              />
            </span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
