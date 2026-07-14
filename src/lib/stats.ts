/** Pearson correlation coefficient over paired non-null values. */
export function pearson(pairs: [number | null, number | null][]): { r: number; n: number } | null {
  const clean = pairs.filter((p): p is [number, number] => p[0] !== null && p[1] !== null);
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
  return { r: num / Math.sqrt(dx * dy), n };
}
