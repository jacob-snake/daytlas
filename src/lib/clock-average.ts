/** Circular average: 23:30 and 00:30 average to midnight, not noon. */
export function averageClock(hours: number[]): number | null {
  const clean = hours.filter(Number.isFinite);
  if (!clean.length) return null;
  const angle = (h: number) => (h * Math.PI) / 12;
  const x = clean.reduce((s, h) => s + Math.cos(angle(h)), 0) / clean.length;
  const y = clean.reduce((s, h) => s + Math.sin(angle(h)), 0) / clean.length;
  if (Math.hypot(x, y) < 1e-6) return null;
  return ((Math.atan2(y, x) * 12) / Math.PI + 24) % 24;
}
