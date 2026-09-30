"use client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
export function DataError({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  const expired = /401|expired|reconnect/i.test(error);
  const permission = /403|membership|permission/i.test(error);
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>
        {expired
          ? "Your connection needs refreshing"
          : "We couldn’t load this view"}
      </AlertTitle>
      <AlertDescription>
        <p>
          {expired
            ? "Reconnect with Oura to continue exploring your history."
            : permission
              ? "Oura couldn’t grant access to this data. Check your membership and the permissions granted to this app."
              : "Check your connection and try again. Your data at Oura has not changed."}
        </p>
        <div className="mt-3 flex gap-2">
          {expired || permission ? (
            <Button asChild variant="outline">
              <a href="/connect">Review connection</a>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={retry ?? (() => window.location.reload())}
            >
              Try again
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
export function HistoryLoading() {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-5 py-4 text-sm text-muted-foreground"
    >
      <Spinner className="size-4 shrink-0" />
      <p>
        Preparing your history. The first sync can take a little longer; future
        visits use this device’s cache.
      </p>
    </div>
  );
}
export function NoData({
  title = "Your history is still taking shape",
}: {
  title?: string;
}) {
  return (
    <div className="rounded-3xl bg-card px-6 py-12 text-center shadow-[var(--shadow-border)]">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Sync your ring in the Oura app, then try again. If you selected a date
        range, try a wider one.
      </p>
      <Button
        className="mt-5"
        variant="outline"
        onClick={() => window.location.reload()}
      >
        Refresh view
      </Button>
    </div>
  );
}
