/** End of 31 October in Europe/Prague (CET). No automatic billing or paywall. */
export const launch = {
  freeUntil: "2026-11-01T00:00:00+01:00",
  freeUntilLabel: "31 October 2026",
  timezone: "Europe/Prague",
} as const;

export function freePeriodRemaining(now: number) {
  const total = Math.max(
    0,
    Math.ceil((Date.parse(launch.freeUntil) - now) / 60_000),
  );
  return {
    expired: total === 0,
    days: Math.floor(total / 1440),
    hours: Math.floor((total % 1440) / 60),
    minutes: total % 60,
  };
}
