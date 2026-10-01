"use client";

/* eslint-disable @next/next/no-img-element -- Approved artwork stays untransformed. */
import { useEffect, useId, useRef } from "react";
import { brand } from "@/lib/brand-config";
import {
  orbs,
  orbit,
  pose,
  referenceOpacity,
  ORBIT_INITIAL_WAIT_MS,
  ORBIT_PAUSE_MS,
} from "@/lib/brand-orbit";

/** Approved Orbit: 3.6 seconds of motion, then 12 seconds of the exact static logo. */
export function BrandOrbit({ className }: { className?: string }) {
  const host = useRef<HTMLSpanElement>(null);
  const id = `orbit-${useId().replace(/:/g, "")}`;
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false;
    let ready = false;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let animations: Animation[] = [];
    const allowed = () =>
      visible && ready && !document.hidden && !reduced.matches && !disposed;
    function stop() {
      clearTimeout(timer);
      animations.forEach((a) => a.cancel());
      animations = [];
      node!.dataset.orbitState = "rest";
    }
    function schedule(wait = ORBIT_INITIAL_WAIT_MS) {
      stop();
      if (allowed()) timer = setTimeout(play, wait);
    }
    function play() {
      if (!allowed()) return;
      const samples = Array.from(
        { length: 169 },
        (_, i) => (i / 168) * orbit.duration,
      );
      animations = orbs.map((o) =>
        node!.querySelector(`[data-orb="${o.id}"]`)!.animate(
          samples.map((time, i) => ({
            offset: i / 168,
            transform: pose(orbit, o, time).transform,
          })),
          { duration: orbit.duration * 1000, easing: "linear", fill: "both" },
        ),
      );
      animations.push(
        node!.querySelector("[data-orbit-reference]")!.animate(
          samples.map((time, i) => ({
            offset: i / 168,
            opacity: referenceOpacity(orbit, time),
          })),
          { duration: orbit.duration * 1000, easing: "linear", fill: "both" },
        ),
      );
      const start = document.timeline.currentTime;
      animations.forEach((a) => {
        a.startTime = start;
      });
      node!.dataset.orbitState = "playing";
      timer = setTimeout(() => schedule(ORBIT_PAUSE_MS), orbit.duration * 1000);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        schedule();
      },
      { threshold: [0, 0.5] },
    );
    observer.observe(node);
    const refresh = () => schedule();
    document.addEventListener("visibilitychange", refresh);
    reduced.addEventListener("change", refresh);
    // Never replace the fallback with an undecoded source on a slow connection.
    const image = new Image();
    image.src = "/brand/v1.2/motion/orbit-source.png";
    image
      .decode()
      .then(() => {
        ready = true;
        if (!disposed) schedule();
      })
      .catch(() => {});
    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", refresh);
      reduced.removeEventListener("change", refresh);
    };
  }, []);
  return (
    <span
      ref={host}
      className={`brand-orbit ${className ?? ""}`}
      data-orbit-state="rest"
      aria-hidden="true"
    >
      <img
        className="brand-orbit-static"
        src={brand.assets.logo}
        alt=""
        width={160}
        height={64}
      />
      <svg
        className="brand-orbit-motion"
        viewBox="0 0 1400 560"
        focusable="false"
      >
        <svg x="30" y="0" width="560" height="560" viewBox="0 0 1254 1254">
          <defs>
            <image
              id={`${id}-source`}
              width="1254"
              height="1254"
              href="/brand/v1.2/motion/orbit-source.png"
            />
            {orbs.map((o) => (
              <clipPath key={o.id} id={`${id}-${o.id}`}>
                <ellipse cx={o.x} cy={o.y} rx={o.rx} ry={o.ry} />
              </clipPath>
            ))}
          </defs>
          {orbs.map((o) => (
            <g key={o.id} data-orb={o.id} style={{ transformOrigin: "0 0" }}>
              <use href={`#${id}-source`} clipPath={`url(#${id}-${o.id})`} />
            </g>
          ))}
          <use data-orbit-reference href={`#${id}-source`} />
        </svg>
        <image
          href={brand.assets.wordmark}
          x="575"
          y="180"
          width="698"
          height="200"
          preserveAspectRatio="xMinYMid meet"
        />
      </svg>
    </span>
  );
}
