import Image from "next/image";
import { Plus } from "lucide-react";

const devices = [
  {
    name: "Oura",
    image: "oura-ring-4.png",
    alt: "Silver Oura Ring 4",
    width: 640,
    height: 578,
    available: true,
    style: "max-w-[105px] sm:max-w-[115px]",
  },
  {
    name: "WHOOP",
    image: "whoop-5-band.png",
    alt: "WHOOP 5.0 band in Graphite with titanium clasp",
    width: 349,
    height: 400,
    available: false,
    style: "max-w-[90px] sm:max-w-[100px]",
  },
  {
    name: "Polar",
    image: "polar-loop.png",
    alt: "Polar Loop in Night Black",
    width: 600,
    height: 600,
    available: false,
    style: "max-w-[150px] sm:max-w-[170px]",
  },
];

export function WearableSources() {
  return (
    <section
      id="wearables"
      aria-labelledby="wearable-title"
      className="scroll-mt-28 border-t border-border pt-16 text-center"
    >
      <p className="text-sm font-semibold text-muted-foreground">
        Your wearable. A wider view.
      </p>
      <h2
        id="wearable-title"
        className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl"
      >
        Starting with Oura. Growing with you.
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
        Your sleep, readiness and activity, with room for more. WHOOP, Polar and
        other connections are coming soon.
      </p>
      <div className="mx-auto mt-9 grid max-w-[880px] grid-cols-2 gap-3 sm:grid-cols-4">
        {devices.map((device) => (
          <article
            key={device.name}
            className="grid aspect-square min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto_auto] justify-items-center rounded-2xl border border-border bg-white p-3 sm:p-4"
          >
            <div className="flex h-full min-h-0 w-full items-center justify-center">
              <Image
                unoptimized
                src={`/images/wearables/${device.image}`}
                width={device.width}
                height={device.height}
                alt={device.alt}
                className={`h-full max-h-full w-full object-contain ${device.style}`}
              />
            </div>
            <h3 className="mt-3 text-sm font-semibold sm:text-base">
              {device.name}
            </h3>
            <p
              className={`mt-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium sm:text-xs ${device.available ? "text-chart-2" : "text-muted-foreground"}`}
            >
              {device.available && (
                <span
                  className="size-1.5 rounded-full bg-chart-2"
                  aria-hidden="true"
                />
              )}
              {device.available ? "Available now" : "Coming soon"}
            </p>
          </article>
        ))}
        <article className="grid aspect-square min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto_auto] justify-items-center rounded-2xl border border-dashed border-border bg-secondary/30 p-3 sm:p-4">
          <div
            className="flex h-full min-h-0 w-full items-center justify-center"
            aria-hidden="true"
          >
            <span className="grid size-12 place-items-center rounded-full bg-white shadow-[var(--shadow-border)]">
              <Plus
                className="size-5 text-muted-foreground"
                strokeWidth={1.5}
              />
            </span>
          </div>
          <h3 className="mt-3 text-sm font-semibold sm:text-base">
            More wearables
          </h3>
          <p className="mt-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium sm:text-xs text-muted-foreground">
            Coming soon
          </p>
        </article>
      </div>
    </section>
  );
}
