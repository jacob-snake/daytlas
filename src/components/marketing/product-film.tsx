"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function ProductFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <section aria-label="Daytlas product film" className="py-10 sm:py-16">
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
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) video.current?.pause();
          setOpen(next);
          setFailed(false);
        }}
      >
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label="Play product film"
            className="group relative block w-full overflow-hidden rounded-[24px] border border-border/70 bg-[var(--ds-surface-charcoal)] shadow-sm"
          >
            <Image
              src="/media/product-tour-poster.jpg"
              alt="Preview of the Daytlas product tour"
              width={1280}
              height={720}
              unoptimized
              className="aspect-video w-full object-contain"
            />
            <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/20">
              <span className="flex items-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-semibold text-foreground shadow-lg">
                <Play className="size-5 fill-current" aria-hidden="true" /> Play
                film
              </span>
            </span>
          </button>
        </DialogTrigger>
        <DialogContent
          className="!w-[calc(100%-1rem)] !max-w-[1600px] gap-3 overflow-hidden rounded-2xl !bg-[var(--ds-surface-charcoal)] p-3 text-white sm:p-4 [&_[data-slot=button]]:!text-white [&_[data-slot=button]]:!bg-white/10"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            video.current?.focus();
            // The dialog is opened by a user gesture. Keep native controls if play is blocked.
            if (video.current) {
              video.current.muted = false;
              void video.current.play().catch(() => {});
            }
          }}
        >
          <DialogTitle className="pr-10">Daytlas · A little tour</DialogTitle>
          <DialogDescription className="sr-only">
            Product tour with sample data. Use the video controls for sound,
            playback or full screen.
          </DialogDescription>
          {open && (
            <video
              ref={video}
              className="max-h-[calc(100dvh-7rem)] w-full rounded-lg bg-black"
              src="/media/product-tour-with-audio-2026-10-02.mp4"
              poster="/media/product-tour-poster.jpg"
              controls
              autoPlay
              playsInline
              preload="metadata"
              tabIndex={0}
              aria-label="Daytlas product tour"
              onError={() => setFailed(true)}
            />
          )}
          {failed && (
            <p role="status" className="text-sm">
              The film could not load. Please close it and try again.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
