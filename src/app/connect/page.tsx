import { OuraConnection } from "@/components/oura-connection";
import { brand } from "@/lib/brand-config";
import { Brand } from "@/components/brand";
import Link from "next/link";

export const metadata = { title: `Connect with Oura — ${brand.name}` };

export default function Connect() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 py-8">
      <header>
        <Brand />
      </header>
      <main id="main-content" className="flex-1 py-12 sm:py-16">
        <p className="text-sm text-muted-foreground">Connect with Oura</p>
        <OuraConnection />
      </main>
      <footer className="flex flex-wrap justify-center gap-6 pt-8 text-[13px] font-medium text-muted-foreground">
        <Link href="/privacy" className="underline underline-offset-4">
          Privacy
        </Link>
        <Link href="/terms" className="underline underline-offset-4">
          Terms
        </Link>
      </footer>
    </div>
  );
}
