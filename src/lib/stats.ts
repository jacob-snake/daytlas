/** Pearson correlation coefficient over paired non-null values. */
export function pearson(
  pairs: [number | null | undefined, number | null | undefined][],
): { r: number; n: number } | null {
  const clean = pairs.filter(
    (p): p is [number, number] =>
      typeof p[0] === "number" &&
      Number.isFinite(p[0]) &&
      typeof p[1] === "number" &&
      Number.isFinite(p[1]),
  );
  const n = clean.length;
  if (n < 5) return null;
  const mx = clean.reduce((s, [x]) => s + x, 0) / n;
  const my = clean.reduce((s, [, y]) => s + y, 0) / n;
  let num = 0,
    dx = 0,
    dy = 0;
  for (const [x, y] of clean) {
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  const r = num / Math.sqrt(dx * dy);
  if (!Number.isFinite(r)) return null;
  return { r: Math.max(-1, Math.min(1, r)), n };
}
