import Link from "next/link";
import { AppFooter } from "@/components/app-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "About — Woura" };

export default function About() {
  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 p-6 md:p-10">
      <h1 className="text-3xl font-bold tracking-tight">About Woura</h1>

      <Card>
        <CardContent className="space-y-4 pt-5 text-[15px] leading-relaxed">
          <p>
            In 2026, Oura announced it was retiring <em>Oura on the Web</em> — the only place
            where years of ring data could be explored on a big screen. I had been meaning to
            build my own dashboard anyway; that email just made the decision for me.
          </p>
          <p>
            Woura is the result: an open-source, local-first dashboard for your Oura data.
            Long-term trends, correlations, a year wrapped into rings, a barcode of your
            sleep rhythm, and Tag Lab — what your habits actually do to your body the next
            day. Everything the retired web app did, plus the things it never dared to.
          </p>
          <p>
            The rules are simple: <strong>your data never leaves your browser</strong>. No
            servers storing anything, no tracking, no AI reading your health history. Every
            insight is plain statistics you can read in the source code.
          </p>
          <p>
            Woura is free. If it&apos;s useful to you, a coffee keeps it going.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <a href="https://buymeacoffee.com/hadjakub" target="_blank" rel="noreferrer">
            ☕ Buy me a coffee
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="https://github.com/hadjakub/woura" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/privacy">Privacy</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Open the app</Link>
        </Button>
      </div>

      <AppFooter />
    </main>
  );
}
