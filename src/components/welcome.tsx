"use client";
import { trackProductEvent } from "@/lib/product-analytics";
import { ProductShowcase } from "@/components/marketing/product-showcase";
import { ProductPurpose } from "@/components/marketing/product-purpose";
import { WearableSources } from "@/components/marketing/wearable-sources";
import { ProductFilm } from "@/components/marketing/product-film";
import { LaunchCountdown } from "@/components/launch-countdown";
import Image from "next/image";
import { FaqItem } from "@/components/ui/faq-item";
import { Eyebrow } from "@/components/ui/eyebrow";
import { brand } from "@/lib/brand-config";

import Link from "next/link";
import {
  ArrowUpRight01Icon,
  ChartLineData01Icon,
  LockKeyIcon,
  Download04Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { DemoButton } from "@/components/demo-button";
import { AppFooter } from "@/components/app-footer";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { disconnectAndClear, reloadSession } from "@/lib/oura/client";
import { useOuraSession } from "@/lib/use-oura-query";

const subscribeLocation = () => () => {};
const clearFailed = () =>
  new URLSearchParams(window.location.search).get("clear") === "failed";

function ClearDataNotice() {
  const failed = useSyncExternalStore(
    subscribeLocation,
    clearFailed,
    () => false,
  );
  const [busy, setBusy] = useState(false);
  const [retried, setRetried] = useState(false);
  if (!failed) return null;
  async function retry() {
    setBusy(true);
    try {
      await disconnectAndClear();
      reloadSession();
    } catch {
      setRetried(true);
      setBusy(false);
    }
  }
  return (
    <Alert role="alert" className="mb-5">
      <AlertTitle>Local data could not be fully cleared</AlertTitle>
      <AlertDescription>
        <p>
          Your dashboard has been closed. Close other {brand.name} tabs, then
          retry clearing this browser’s saved data. You can also delete{" "}
          {brand.name}’s site data in your browser settings.
        </p>
        {retried && (
          <p className="mt-2">
            This browser is still preventing erasure. Use its site-data settings
            to finish clearing {brand.name}.
          </p>
        )}
        <Button
          className="mt-3"
          variant="outline"
          onClick={retry}
          disabled={busy}
        >
          {busy ? "Clearing…" : "Retry clearing local data"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

const series = [
  68, 73, 70, 79, 75, 82, 73, 77, 72, 81, 79, 85, 78, 82, 75, 86, 80, 87, 82,
  84, 78, 88, 85, 90, 85, 89, 83, 91, 86, 89,
];
function ProductPreview() {
  const session = useOuraSession();
  const connected = session !== null && session !== "demo";
  const points = series
    .map((v, i) => `${i * 20},${210 - (v - 55) * 4}`)
    .join(" ");
  return (
    <div
      className="preview-shell"
      aria-label="Dashboard preview with fictional example data"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <p className="text-xs font-medium">A little perspective, every day.</p>
      </div>
      <div className="grid gap-3 px-3 pb-3 sm:grid-cols-[1fr_0.43fr] sm:gap-4 sm:px-4 sm:pb-4">
        <div className="rounded-[20px] bg-card p-5 sm:p-7">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">The long view</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                Small days. Bigger patterns.
              </h2>
            </div>
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs">
              Sleep
            </span>
          </div>
          <div className="mt-7 grid grid-cols-3 gap-4">
            {[
              { label: "Sleep", value: "89", color: "var(--chart-1)" },
              { label: "Readiness", value: "86", color: "var(--chart-2)" },
              { label: "Activity", value: "92", color: "var(--chart-3)" },
            ].map((s) => (
              <div key={s.label}>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </p>
                <p className="mt-1 text-[40px] font-medium leading-tight tracking-[-0.06em] sm:text-5xl">
                  {s.value}
                  <span className="ml-1 text-xs font-normal tracking-normal text-muted-foreground">
                    /100
                  </span>
                </p>
              </div>
            ))}
          </div>
          <svg
            viewBox="0 0 580 220"
            className="mt-4 w-full overflow-visible"
            role="img"
            aria-label="Illustrative sleep scores gradually increasing over a month"
          >
            <defs>
              <linearGradient id="preview-fill" x1="0" x2="0" y1="0" y2="1">
                <stop stopColor="var(--chart-1)" stopOpacity="0.12" />
                <stop offset="1" stopColor="var(--chart-1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[50, 105, 160, 210].map((y) => (
              <line
                key={y}
                x1="0"
                x2="580"
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray="3 5"
              />
            ))}
            <polygon
              points={`0,210 ${points} 580,210`}
              fill="url(#preview-fill)"
            />
            <polyline
              points={points}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            <span>Week 1</span>
            <span>Week 2</span>
            <span>Week 3</span>
            <span>Week 4</span>
          </div>
        </div>
        <div className="preview-note flex flex-col justify-between rounded-[20px] p-6 text-left sm:p-7">
          <div>
            <p className="text-xs font-medium text-white/70">
              Make room for context
            </p>
            <div className="my-7 flex h-12 items-end gap-1" aria-hidden="true">
              {[16, 27, 22, 32, 25, 38, 30, 34, 42, 37, 48, 43, 46].map(
                (h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-t-sm bg-white/65"
                    style={{ height: h, opacity: 0.3 + i / 19 }}
                  />
                ),
              )}
            </div>
            <h3 className="text-2xl font-medium leading-[1.2] tracking-tight">
              One score is a moment.
              <br />A pattern tells you more.
            </h3>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-white/70">
            Explore your own baseline. Compare your weeks. Find the questions
            worth asking.
          </p>
          <Link
            href={connected ? "/app" : "/connect"}
            className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {connected ? "Open your dashboard" : "Connect with Oura"}{" "}
            <Icon icon={ArrowUpRight01Icon} className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
function ProductActions() {
  const session = useOuraSession();
  return (
    <div className="flex flex-wrap justify-center gap-3">
      <Button asChild size="lg">
        <Link
          href={session !== null && session !== "demo" ? "/app" : "/connect"}
        >
          {session !== null && session !== "demo"
            ? "Open your dashboard"
            : "Connect with Oura"}
          <Icon icon={ArrowUpRight01Icon} className="ml-2 size-4" />
        </Link>
      </Button>
      <DemoButton variant="outline" alwaysDemo />
    </div>
  );
}
export function Welcome() {
  const session = useOuraSession();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <div className="landing mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-12">
      <header
        data-scrolled={scrolled}
        className="landing-header flex h-20 items-center justify-between gap-3 sm:h-24"
      >
        <Brand />
        <nav
          aria-label="Main navigation"
          className="flex items-center gap-2 sm:gap-5"
        >
          <a
            href="#how-it-works"
            onClick={() =>
              trackProductEvent("website_interacted", {
                action: "how_it_works_opened",
              })
            }
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            How it works
          </a>
          <Link
            href="/about"
            onClick={() =>
              trackProductEvent("website_interacted", {
                action: "story_opened",
              })
            }
            className="hidden whitespace-nowrap text-sm text-muted-foreground hover:text-foreground sm:inline"
          >
            The story
          </Link>
          <Button
            variant="outline"
            asChild
            className="rounded-full px-3 text-xs sm:px-4 sm:text-sm"
          >
            <Link href={session ? "/app" : "/connect"}>
              {session ? "Open app" : "Connect your ring"}{" "}
              <Icon icon={ArrowUpRight01Icon} />
            </Link>
          </Button>
        </nav>
      </header>
      <main id="main-content">
        <ClearDataNotice />
        <section className="pt-10 pb-14 text-center sm:pt-16 sm:pb-16">
          <Eyebrow
            leading={
              <Image
                src="/images/oura-ring-cutout.png"
                alt=""
                width={44}
                height={36}
                className="h-9 w-11 shrink-0 object-contain"
                unoptimized
              />
            }
          >
            Your Oura history, made clearer.
          </Eyebrow>
          <Typography
            as="h1"
            variant="display"
            className="mx-auto mt-7 max-w-4xl"
          >
            Your days, in a <br />
            bigger picture.
          </Typography>
          <p className="mx-auto mt-6 max-w-[520px] text-base leading-relaxed text-muted-foreground sm:text-lg">
            See how your sleep, readiness and activity change over time. Compare
            your weeks, explore your habits and put a single score in context.
          </p>
          <div className="mt-8">
            <ProductActions />
          </div>
          <p className="mx-auto mt-5 text-sm text-muted-foreground">
            {session && session !== "demo"
              ? "Your Oura connection is ready when you are."
              : "Try every view with sample data. No account needed."}
          </p>
        </section>
        <ProductPreview />
        <ProductPurpose />
        <ProductShowcase />
        <ProductFilm />
        <section id="how-it-works" className="scroll-mt-28 py-20 sm:py-28">
          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <h2 className="max-w-lg text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
              Built for the curious
              <br />
              person behind the numbers.
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              A morning check-in or a Sunday deep dive. The detail is here when
              you want it.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-10">
            {[
              {
                icon: ChartLineData01Icon,
                title: "Take the long view",
                text: "Go from a single night to months of trends. Compare metrics and see what moves together.",
                label: "Trends & correlations",
              },
              {
                icon: LockKeyIcon,
                title: "Keep it personal",
                text: "Analysis runs in your browser. The app has no health database or advertising. Optional website and demo analytics are off until you allow them.",
                label: "Local analysis",
              },
              {
                icon: Download04Icon,
                title: "Make it your own",
                text: "Explore the habits you tag. Download readable CSV or JSON files for your own records.",
                label: "Tag Lab & export",
              },
            ].map((f) => (
              <article key={f.title} className="border-t border-border pt-6">
                <Icon icon={f.icon} className="mb-6 size-6" />
                <h3 className="text-lg font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {f.text}
                </p>
                <p className="mt-5 text-xs font-medium">{f.label}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="grid gap-10 rounded-[28px] bg-secondary/60 p-7 sm:grid-cols-2 sm:p-12">
          <div>
            <h2 className="text-3xl font-medium tracking-[-0.045em]">
              Your history.
              <br />A transparent home.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Data travels through this app’s server to connect to Oura, then is
              cached on this device. Your insights are calculated here, with
              ordinary statistics.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline underline-offset-4"
              href="/privacy"
            >
              Understand the data flow <Icon icon={ArrowUpRight01Icon} />
            </Link>
          </div>
          <div className="space-y-3">
            {[
              {
                q: "Can I try it without a ring?",
                a: "Yes. The demo uses invented sample data and makes no requests to Oura. It includes every main view, from trends to Tag Lab.",
              },
              {
                q: "What do I need to connect?",
                a: "An Oura account with API access. Select Connect with Oura, sign in on Oura’s website and choose what to share. You’ll return here automatically. Oura membership requirements apply; early-access places are limited.",
              },
              {
                q: "Does this replace the Oura app?",
                a: "Keep the Oura app for syncing your ring and your daily check-in. Daytlas gives you more room to explore that history: compare weeks, put metrics side by side and investigate your habits.",
              },
              {
                q: "Where is my health data stored?",
                a: "Your readings pass through this app’s server to connect to Oura, then are cached in your browser. Daytlas has no server-side health database. You can disconnect and clear local data in your profile.",
              },
              {
                q: "Can I take my data with me?",
                a: "Yes. Export your available readings as CSV or JSON from your profile. You can also explore a supported Oura export without connecting a ring.",
              },
              {
                q: "Which features are coming next?",
                a: "WHOOP, Polar, AI chat and connections to compatible AI tools are planned. Oura is available today. No health data is sent to an AI service by Daytlas today.",
              },
              {
                q: "Is this an official Oura product?",
                a: `No. ${brand.name} is an independent, open-source project by Jakub Had. It is not affiliated with or endorsed by Oura, and it does not provide medical advice.`,
              },
            ].map((f) => (
              <FaqItem key={f.q} question={f.q}>
                {f.a}
              </FaqItem>
            ))}
          </div>
        </section>
        <div className="mt-16">
          <WearableSources />
          <section
            aria-labelledby="ai-roadmap-title"
            className="mt-16 rounded-[28px] bg-[var(--ds-surface-navy)] p-7 text-[var(--ds-on-dark)] sm:p-12"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--ds-on-dark-accent)]">
              The next chapter · Coming soon
            </p>
            <h2
              id="ai-roadmap-title"
              className="mt-4 max-w-2xl text-3xl font-medium leading-tight tracking-tight sm:text-4xl"
            >
              Your history has more to tell.
              <br />
              Start with a question.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-[var(--ds-on-dark-muted)]">
              We’re building new ways to explore the patterns behind your days,
              in a conversation that starts with what you’re curious about.
            </p>
            <div className="mt-9 grid gap-8 sm:grid-cols-2">
              <div className="border-t border-white/20 pt-6">
                <p className="text-xs font-semibold text-[var(--ds-on-dark-accent)]">
                  AI chat · Coming soon
                </p>
                <h3 className="mt-3 text-xl font-medium">
                  Ask about your own patterns.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--ds-on-dark-muted)]">
                  A planned chat inside Daytlas, for exploring your history in
                  your own words.
                </p>
                <p className="mt-5 text-base leading-relaxed">
                  “How has my sleep changed over the last three months?”
                </p>
              </div>
              <div className="border-t border-white/20 pt-6">
                <p className="text-xs font-semibold text-[var(--ds-on-dark-accent)]">
                  AI connections · Coming soon
                </p>
                <h3 className="mt-3 text-xl font-medium">
                  Bring context to your AI tools.
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--ds-on-dark-muted)]">
                  Planned connections through MCP, so compatible AI tools can
                  help you explore supported Daytlas data.
                </p>
                <p className="mt-5 text-base leading-relaxed">
                  More of your history behind the questions you already ask.
                </p>
              </div>
            </div>
            <p className="mt-9 border-t border-white/20 pt-5 text-xs leading-relaxed text-[var(--ds-on-dark-muted)]">
              In development. Nothing is sent to an AI service today. Supported
              data, sharing controls and availability will be explained before
              launch.
            </p>
          </section>
        </div>
        <section className="py-20 text-center sm:py-24">
          <h2 className="mb-7 text-3xl font-medium tracking-[-0.045em] sm:text-4xl">
            Meet your bigger picture.
          </h2>
          <ProductActions />
        </section>
        <LaunchCountdown />
      </main>
      <AppFooter />
    </div>
  );
}
