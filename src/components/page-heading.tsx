import { Typography } from "@/components/ui/typography";
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-5 pt-7 pb-2 sm:pt-10">
      <div>
        <Typography as="h1" variant="heading">
          {title}
        </Typography>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
