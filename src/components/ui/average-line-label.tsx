import { usePlotArea, useYAxisScale } from "recharts";
import {
  numericLabelWidth,
  averageBadgePositions,
} from "@/lib/chart-presentation";

type AveragePosition = { value: number; axisId: string | number };

function AverageLabel({
  value,
  color,
  index,
  total,
  widestValue,
  positions,
  viewBox,
}: {
  value: string;
  color: string;
  index: number;
  total: number;
  widestValue: string;
  positions?: AveragePosition[];
  viewBox?: unknown;
}) {
  const plot = usePlotArea();
  const primaryScale = useYAxisScale("primary");
  const secondaryScale = useYAxisScale("secondary");
  const defaultScale = useYAxisScale(0);
  if (!plot || !viewBox || typeof viewBox !== "object" || !("y" in viewBox))
    return <g />;
  const label = `Avg ${value}`;
  const pillWidth = numericLabelWidth(label) + 20;
  const columnWidth = numericLabelWidth(`Avg ${widestValue}`) + 28;
  const columns = Math.max(
    1,
    Math.min(total, Math.floor(plot.width / columnWidth)),
  );
  const column = index % columns;

  const x =
    plot.x +
    4 +
    (columns > 1 ? (column * (plot.width - columnWidth)) / (columns - 1) : 0);
  const desired = (positions ?? [{ value: 0, axisId: 0 }]).map((item) => {
    const scale =
      item.axisId === "primary"
        ? primaryScale
        : item.axisId === "secondary"
          ? secondaryScale
          : defaultScale;
    return (
      (positions && scale ? Number(scale(item.value)) : Number(viewBox.y)) - 12
    );
  });
  const ys = averageBadgePositions(
    desired,
    columns,
    plot.y + 4,
    plot.y + plot.height - 28,
  );
  const y = ys[index] ?? Math.max(plot.y + 4, Number(viewBox.y) - 12);
  const lineY = Number(viewBox.y);
  return (
    <g
      aria-label={`Average ${value}`}
      className="chart-average-label"
      pointerEvents="none"
    >
      {Math.abs(y + 12 - lineY) > 4 && (
        <path
          d={`M ${x + 8} ${lineY} V ${y + 12}`}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.7}
        />
      )}
      <rect x={x} y={y} width={pillWidth} height={24} rx={12} fill={color} />
      <text
        x={x + 10}
        y={y + 16.5}
        style={{
          fill: "#fff",
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {label}
      </text>
    </g>
  );
}

/** Spread solid average badges across the plot; never truncate the value. */
export function averageLineLabel(
  value: string,
  color: string,
  index: number,
  total: number,
  widestValue = value,
  positions?: AveragePosition[],
) {
  return function Label(props: { viewBox?: unknown }) {
    return (
      <AverageLabel
        {...props}
        value={value}
        color={color}
        index={index}
        total={total}
        widestValue={widestValue}
        positions={positions}
      />
    );
  };
}
