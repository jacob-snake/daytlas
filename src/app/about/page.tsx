import { brand } from "@/lib/brand-config";
import { DocumentShell } from "@/components/document-shell";
import { DemoButton } from "@/components/demo-button";
import { Button } from "@/components/ui/button";
export const metadata = { title: `The story — ${brand.name}` };
export default function About() {
  return (
    <DocumentShell
      title="For the bigger picture."
      intro="I wanted a quiet place to spend more time with my own data. So I started building one."
    >
      <section>
        <h2>Built by Jakub Had</h2>
        <p>
          A daily score is useful. But I wanted to see the weeks behind it: how
          my sleep shifts, how my routines differ, and which questions are worth
          exploring. {brand.name} brings that perspective to a bigger screen.
        </p>
        <p>
          It’s a personal project with an open source codebase. The focus is
          simple: readable long-term trends, transparent comparisons, useful
          exports, and a clear explanation of where your data goes.
        </p>
      </section>
      <section>
        <h2>Curiosity over certainty</h2>
        <p>
          A chart can help you notice something. It cannot tell you why it
          happened. {brand.name} shows the numbers behind a comparison, uses
          ordinary statistics, and avoids treating an association as health
          advice.
        </p>
        <p>
          The demo lets you explore the product with fictional data before
          connecting anything personal.
        </p>
        <div className="mt-5">
          <DemoButton />
        </div>
      </section>
      <section>
        <h2>Built in the open</h2>
        <p>
          Have feedback, found a bug, or want to help? Follow the project and
          tell me which question you wish your data could answer. Keep personal
          readings and account details out of public messages.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <a href="https://www.linkedin.com/in/jakub-had/">
              Follow Jakub on LinkedIn
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={brand.sourceUrl}>Explore the source</a>
          </Button>
        </div>
      </section>
    </DocumentShell>
  );
}
