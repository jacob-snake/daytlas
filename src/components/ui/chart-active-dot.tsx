/** Layered, static halo works in reduced-motion mode and without SVG filters. */
export function ChartActiveDot({
  cx,
  cy,
  stroke,
  fill,
}: {
  cx?: number;
  cy?: number;
  stroke?: string;
  fill?: string;
}) {
  if (cx === undefined || cy === undefined) return <g />;
  const color = fill && fill !== "none" ? fill : stroke;
  return (
    <g className="chart-active-dot" pointerEvents="none" aria-hidden="true">
      <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.08} />
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.15} />
      <circle
        cx={cx}
        cy={cy}
        r={5.5}
        fill={color}
        stroke="var(--card)"
        strokeWidth={2.5}
      />
    </g>
  );
}
