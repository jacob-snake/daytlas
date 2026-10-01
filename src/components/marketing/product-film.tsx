"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
export function ProductFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false),
    [loaded, setLoaded] = useState(false),
    [allowed, setAllowed] = useState(false),
    [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAllowed(!motion.matches);
    update();
    motion.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => {
        setNear(entry.isIntersecting);
        if (entry.isIntersecting) setLoaded(true);
      },
      { rootMargin: "100px" },
    );
    if (box.current) observer.observe(box.current);
    return () => {
      observer.disconnect();
      motion.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    const update = () => {
      if (near && allowed && !document.hidden)
        void el.play().catch(() => setPlaying(false));
      else el.pause();
    };
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, [near, allowed]);
  return (
    <section
      ref={box}
      aria-label="Daytlas product film"
      className="py-10 sm:py-16"
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            A little tour
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            See your history come together.
          </h2>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          An early product film with sample data. Branding and interface are
          being updated.
        </p>
      </div>
      <div className="relative overflow-hidden rounded-[24px] border border-border/70 bg-[#18232b] shadow-sm">
        <video
          ref={video}
          className="aspect-video w-full object-contain"
          width={1280}
          height={720}
          src={loaded ? "/media/product-tour-2026-10-01.mp4" : undefined}
          poster="/media/product-tour-poster.jpg"
          muted
          loop
          playsInline
          preload="none"
          aria-label="Product film with fictional examples of scores, trends, year and tags"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setFailed(true)}
        />
        <Button
          variant="outline"
          className="!absolute bottom-3 right-3 !bg-white !text-black shadow-sm"
          aria-label={playing ? "Pause product film" : "Play product film"}
          onClick={() => {
            setNear(true);
            setLoaded(true);
            if (playing) {
              setAllowed(false);
              video.current?.pause();
            } else {
              setAllowed(true);
              void video.current?.play().catch(() => setPlaying(false));
            }
          }}
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          <span className="hidden sm:inline">{playing ? "Pause" : "Play"}</span>
        </Button>
      </div>
      {failed && (
        <p className="mt-3 text-sm text-muted-foreground">
          The film is unavailable. Explore the five views above.
        </p>
      )}
    </section>
  );
}
