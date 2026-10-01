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
    style: "max-w-[150px] sm:max-w-[175px]",
  },
  {
    name: "WHOOP",
    image: "whoop-5.webp",
    alt: "WHOOP 5.0 band with wireless PowerPack",
    width: 640,
    height: 316,
    available: false,
    style: "max-w-[235px]",
  },
  {
    name: "Polar",
    image: "polar-loop.png",
    alt: "Polar Loop in Night Black",
    width: 600,
    height: 600,
    available: false,
    style: "max-w-[260px]",
  },
];

export function WearableSources() {
  return (
    <section
      id="wearables"
      aria-labelledby="wearable-title"
      className="scroll-mt-8 border-t border-border pt-16 text-center"
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
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {devices.map((device) => (
          <article
            key={device.name}
            className="flex flex-col rounded-[28px] border border-border bg-white px-5 pb-8 pt-5"
          >
            <div className="flex h-48 items-center justify-center">
              <Image
                unoptimized
                src={`/images/wearables/${device.image}`}
                width={device.width}
                height={device.height}
                alt={device.alt}
                className={`h-auto max-h-48 w-full object-contain ${device.style}`}
              />
            </div>
            <h3 className="mt-5 text-xl font-semibold">{device.name}</h3>
            <p
              className={`mt-2 text-sm font-medium ${device.available ? "text-chart-2" : "text-muted-foreground"}`}
            >
              {device.available ? "Available now" : "Coming soon"}
            </p>
          </article>
        ))}
        <article className="flex flex-col rounded-[28px] border border-dashed border-border bg-secondary/30 px-5 pb-8 pt-5">
          <div
            className="flex h-48 items-center justify-center"
            aria-hidden="true"
          >
            <span className="grid size-20 place-items-center rounded-full bg-white shadow-[var(--shadow-border)]">
              <Plus
                className="size-7 text-muted-foreground"
                strokeWidth={1.5}
              />
            </span>
          </div>
          <h3 className="mt-5 text-xl font-semibold">More wearables</h3>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Coming soon
          </p>
        </article>
      </div>
      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Only Oura is supported today. Independent app, not affiliated with or
        endorsed by these brands.
      </p>
    </section>
  );
}
