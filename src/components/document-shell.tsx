import { Typography } from "@/components/ui/typography";
import { Brand } from "@/components/brand";
import { AppFooter } from "@/components/app-footer";
export function DocumentShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <header>
        <Brand />
      </header>
      <main id="main-content" className="py-14 sm:py-20">
        <Typography as="h1" variant="heading">
          {title}
        </Typography>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          {intro}
        </p>
        <div className="mt-10 space-y-8 text-sm leading-7 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_p+p]:mt-3 [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
