"use client";
import {
  usePlotArea,
  useXAxisScale,
  useYAxisTicks,
  ZIndexLayer,
} from "recharts";
import {
  calendarBoundaries,
  calendarGridStyle,
  horizontalGrid,
  minorGridCoordinates,
} from "@/lib/chart-presentation";

/** Uses the axis' own tick positions; overlays never duplicate the grid. */
export function ChartGrid({
  yAxisId = 0,
  days,
}: {
  yAxisId?: string | number;
  days?: readonly string[];
}) {
  const plot = usePlotArea();
  const ticks = useYAxisTicks(yAxisId);
  const xScale = useXAxisScale();
  if (!plot || !ticks) return null;
  const ys = ticks
    .map((t) => t.coordinate)
    .filter((y) => y >= plot.y - 0.5 && y <= plot.y + plot.height + 0.5);
  const boundaries = days?.length
    ? calendarBoundaries(days[0], days[days.length - 1])
    : [];
  return (
    <ZIndexLayer zIndex={-100}>
      <g
        className="chart-grid"
        pointerEvents="none"
        aria-hidden="true"
        stroke={horizontalGrid.stroke}
      >
        {minorGridCoordinates(ys).map((y) => (
          <line
            key={`minor-${y}`}
            className="chart-grid-minor"
            x1={plot.x}
            x2={plot.x + plot.width}
            y1={y}
            y2={y}
            strokeOpacity={0.055}
          />
        ))}
        {ys.map((y) => (
          <line
            key={`major-${y}`}
            className="chart-grid-major"
            x1={plot.x}
            x2={plot.x + plot.width}
            y1={y}
            y2={y}
            strokeOpacity={horizontalGrid.strokeOpacity}
          />
        ))}
        {boundaries.map(({ day, kind }) => {
          if (!days || !xScale) return null;
          const next = days.findIndex((d) => d >= day);
          if (next < 0) return null;
          const exact = Number(xScale(days[next]));
          // Weekly/monthly labels need true boundary positions between their samples.
          const previous = Math.max(0, next - 1);
          const fraction =
            next === previous
              ? 1
              : (Date.parse(day) - Date.parse(days[previous])) /
                (Date.parse(days[next]) - Date.parse(days[previous]));
          const x =
            Number(xScale(days[previous])) +
            fraction * (exact - Number(xScale(days[previous])));
          return Number.isFinite(x) ? (
            <line
              key={day}
              className={`chart-grid-${kind}`}
              data-boundary={day}
              x1={x}
              x2={x}
              y1={plot.y}
              y2={plot.y + plot.height}
              {...calendarGridStyle[kind]}
            />
          ) : null;
        })}
      </g>
    </ZIndexLayer>
  );
}
