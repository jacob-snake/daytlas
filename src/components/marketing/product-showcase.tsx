"use client";
import "@/components/day-detail/day-picker.css";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  LayoutDashboard,
  Tags,
  Orbit,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useOuraSession } from "@/lib/use-oura-query";
import { setMode, reloadSession } from "@/lib/oura/client";
const views = [
  {
    id: "day",
    label: "Day detail",
    icon: CalendarDays,
    title: "One day. All the context.",
    text: "Your night, recovery and activity, with detailed readings and a comparison with the previous 30 days.",
    detail: "Follow a night, moment by moment.",
    href: "/app/day",
  },
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    title: "Your daily perspective.",
    text: "Your latest scores, recent patterns and cardiovascular age. A place to see how things stand before you explore further.",
    detail: "A little perspective, every day.",
    href: "/app",
  },
  {
    id: "trends",
    label: "Trends",
    icon: ChartNoAxesCombined,
    title: "See what changes together.",
    text: "Explore longer periods, place metrics alongside each other and look for relationships in your recorded history.",
    detail: "Relationships to explore. Not proof of cause.",
    href: "/app/trends",
  },
  {
    id: "year",
    label: "Your year",
    icon: Orbit,
    title: "Every day adds up.",
    text: "Step back into your seasons. Browse your monthly sleep, annual rhythms and the days that make up your year.",
    detail: "Small days. A bigger picture.",
    href: "/app/year",
  },
  {
    id: "tags",
    label: "Tag Lab",
    icon: Tags,
    title: "Get curious about your habits.",
    text: "Start with a tag. Compare the days that follow and explore how your recorded measurements differ.",
    detail: "Your habits, with room for questions.",
    href: "/app/tags",
  },
] as const;
function MiniView({ view }: { view: string }) {
  const line =
    "M20 115 L45 100 L70 112 L95 70 L120 83 L145 66 L170 92 L195 53 L220 76 L245 41 L270 58 L295 46 L320 75 L345 30 L370 49 L400 22";
  return (
    <div
      aria-label="Illustrative sample data"
      className="relative min-w-0 rounded-[24px] border border-border/60 bg-white p-5 shadow-sm sm:p-8"
    >
      <div className="mb-8 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>Daytlas · {views.find((v) => v.id === view)?.label}</span>
        <span className="rounded-full bg-secondary px-3 py-1">Sample data</span>
      </div>
      {view === "day" ? (
        <>
          <div className="mb-7 grid grid-cols-7 gap-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div
                key={i}
                className={`flex min-w-0 flex-col items-center gap-3 rounded-2xl px-1 py-2 ${i === 4 ? "bg-blue-50" : ""}`}
              >
                <span className="text-xs text-muted-foreground">{d}</span>
                <span className="day-picker-orb !size-5 !opacity-100 sm:!size-[26px]" />
                <span className="text-xs font-semibold">{21 + i}</span>
              </div>
            ))}
          </div>
          <p className="font-semibold">Your night, in detail</p>
          <svg viewBox="0 0 420 160" className="mt-5 w-full" aria-hidden="true">
            {[25, 65, 105, 145].map((y) => (
              <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="#e8ebef" />
            ))}
            {[0, 1, 2, 1, 3, 2, 1, 0, 1, 2, 1, 3, 0].map((n, i) => (
              <g key={i}>
                <path
                  d={`M${i * 32} ${25 + n * 40}H${i * 32 + 32}${i < 12 ? `V${25 + [0, 1, 2, 1, 3, 2, 1, 0, 1, 2, 1, 3, 0][i + 1] * 40}` : ""}`}
                  fill="none"
                  stroke="#a3b6d5"
                />
                <rect
                  x={i * 32}
                  y={16 + n * 40}
                  width="32"
                  height="18"
                  rx="3"
                  fill={["#77776f", "#9770d4", "#93acd2", "#486fba"][n]}
                />
              </g>
            ))}
          </svg>
        </>
      ) : view === "year" ? (
        <>
          <p className="text-2xl font-bold tracking-tight">A year in colour.</p>
          <div className="mt-7 grid grid-cols-12 gap-2" aria-hidden="true">
            {Array.from({ length: 84 }, (_, i) => (
              <span
                key={i}
                className="aspect-square rounded-full"
                style={{
                  background: `color-mix(in oklab, var(--chart-1) ${25 + ((i * 17) % 76)}%, #fff)`,
                }}
              />
            ))}
          </div>
          <div className="mt-6 flex justify-between text-xs text-muted-foreground">
            <span>January</span>
            <span>December</span>
          </div>
        </>
      ) : view === "tags" ? (
        <>
          <p className="text-xl font-bold">The morning after.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-foreground px-3 py-2 text-background">
              Late meal
            </span>
            <span className="rounded-full bg-secondary px-3 py-2">
              Evening walk
            </span>
            <span className="rounded-full bg-secondary px-3 py-2">Reading</span>
          </div>
          <div className="mt-7 space-y-5">
            {[
              ["Average HRV", "−6.7 ms", 70],
              ["Sleep score", "−3.9 pts", 42],
              ["Deep sleep", "−0.1 h", 28],
              ["Resting heart rate", "+1.9 bpm", 52],
            ].map(([label, value, width]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between gap-4 text-sm font-semibold">
                  <span>{label}</span>
                  <span>{value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[var(--chart-1)]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Readiness", "82"],
              ["Sleep", "86"],
              [
                view === "overview" ? "Heart age" : "Activity",
                view === "overview" ? "35" : "74",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight">
                  {value}
                  <span className="ml-1 text-xs font-medium text-muted-foreground">
                    {label === "Heart age" ? "years" : "/100"}
                  </span>
                </p>
              </div>
            ))}
          </div>
          <svg viewBox="0 0 420 170" className="mt-8 w-full" aria-hidden="true">
            {[30, 70, 110, 150].map((y) => (
              <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="#e8ebef" />
            ))}
            <path
              d={line}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {view === "trends" && (
              <path
                d={line}
                transform="translate(0 22) scale(1 .8)"
                fill="none"
                stroke="var(--chart-2)"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            )}
          </svg>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Earlier</span>
            <span>Today</span>
          </div>
        </>
      )}
    </div>
  );
}
export function ProductShowcase() {
  const [selected, setSelected] = useState("day");
  const session = useOuraSession();
  return (
    <section
      id="product-views"
      className="py-10 sm:py-16"
      aria-labelledby="views-title"
    >
      <div className="mb-8 max-w-2xl">
        <p className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Five ways to see your days
        </p>
        <h2
          id="views-title"
          className="text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl"
        >
          From one night
          <br />
          to your bigger picture.
        </h2>
      </div>
      <Tabs value={selected} onValueChange={setSelected}>
        <TabsList
          aria-label="Explore Daytlas views"
          className="!flex !w-full !flex-wrap gap-1 !rounded-2xl !p-2 sm:!w-fit"
        >
          {views.map((v) => (
            <TabsTrigger
              key={v.id}
              value={v.id}
              className="min-h-11 !flex-none whitespace-nowrap !px-3 sm:!px-4"
            >
              <v.icon className="size-4" />
              {v.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {views.map((v) => (
          <TabsContent key={v.id} value={v.id} className="mt-8">
            <div className="grid items-center gap-8 lg:grid-cols-[.75fr_1.25fr] lg:gap-14">
              <div>
                <p className="mb-4 text-xs font-semibold text-[var(--chart-1)]">
                  {String(views.indexOf(v) + 1).padStart(2, "0")} / 05
                </p>
                <h3 className="max-w-sm text-3xl font-bold leading-tight tracking-tight">
                  {v.title}
                </h3>
                <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {v.text}
                </p>
                <p className="mt-6 text-sm font-semibold">{v.detail}</p>
                <Button
                  variant="outline"
                  className="mt-8"
                  asChild={!!session}
                  onClick={
                    !session
                      ? () => {
                          setMode("demo");
                          reloadSession(v.href);
                        }
                      : undefined
                  }
                >
                  {session ? (
                    <Link href={v.href}>
                      Open {v.label}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Explore {v.label}
                      <ArrowUpRight className="size-4" />
                    </span>
                  )}
                </Button>
              </div>
              <MiniView view={v.id} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
