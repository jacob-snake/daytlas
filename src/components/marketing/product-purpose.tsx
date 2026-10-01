import { Smartphone, Monitor, ArrowUpRight } from "lucide-react";

export function ProductPurpose() {
  return (
    <section
      id="a-wider-view"
      aria-labelledby="purpose-title"
      className="scroll-mt-8 py-16 sm:py-24"
    >
      <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <h2
          id="purpose-title"
          className="max-w-lg text-4xl font-medium leading-[1.12] tracking-[-0.05em] sm:text-5xl"
        >
          A different view.
          <br />
          <span className="text-[#246bd1]">A shared purpose.</span>
        </h2>
        <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
          Keep your daily check-in with Oura. Open Daytlas when you want more
          room to explore your history.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="flex flex-col rounded-3xl bg-secondary/65 p-7 sm:p-10">
          <p className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <Smartphone className="size-5" aria-hidden="true" /> Oura, on your
            phone
          </p>
          <h3 className="mt-9 max-w-xs text-3xl font-medium leading-tight tracking-tight">
            Your day, close at hand.
          </h3>
          <ul className="mt-7 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <li>Sync your ring and check your daily scores.</li>
            <li>Follow personalised insights as your day unfolds.</li>
            <li>Keep your health companion with you, wherever you go.</li>
          </ul>
          <p className="mt-auto pt-10 text-lg font-semibold">
            A moment to check in.
          </p>
        </article>
        <article className="flex flex-col rounded-3xl bg-[#152c45] p-7 text-white sm:p-10">
          <p className="flex items-center gap-3 text-sm font-semibold text-[#a8caff]">
            <Monitor className="size-5" aria-hidden="true" /> Daytlas, in your
            browser
          </p>
          <h3 className="mt-9 max-w-xs text-3xl font-medium leading-tight tracking-tight">
            Your history, with room to breathe.
          </h3>
          <ul className="mt-7 space-y-4 text-sm leading-relaxed text-white/80">
            <li>Explore a night, a few weeks or a whole year.</li>
            <li>Put metrics side by side and explore correlations.</li>
            <li>Look at your habits in Tag Lab, at your own pace.</li>
          </ul>
          <a
            href="#product-views"
            className="mt-auto flex min-h-11 w-fit items-center gap-2 pt-10 text-lg font-semibold underline-offset-4 hover:underline"
          >
            Time for the bigger picture.
            <ArrowUpRight className="size-5 shrink-0" aria-hidden="true" />
          </a>
        </article>
      </div>
    </section>
  );
}
