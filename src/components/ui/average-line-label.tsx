import { useLayoutEffect, useRef, useState } from "react";
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
  const textRef = useRef<SVGTextElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      const width = textRef.current?.getComputedTextLength();
      if (active && width && Number.isFinite(width))
        setMeasuredWidth(Math.ceil(width));
    };
    measure();
    void document.fonts.ready.then(measure);
    return () => {
      active = false;
    };
  }, [value, viewBox]);
  const plot = usePlotArea();
  const primaryScale = useYAxisScale("primary");
  const secondaryScale = useYAxisScale("secondary");
  const defaultScale = useYAxisScale(0);
  if (!plot || !viewBox || typeof viewBox !== "object" || !("y" in viewBox))
    return <g />;
  const label = `${value} avg`;
  const pillWidth = (measuredWidth ?? numericLabelWidth(label, 11)) + 14;
  const columns = 1;
  const x = plot.x + plot.width - pillWidth - 2;
  const desired = (positions ?? [{ value: 0, axisId: 0 }]).map((item) => {
    const scale =
      item.axisId === "primary"
        ? primaryScale
        : item.axisId === "secondary"
          ? secondaryScale
          : defaultScale;
    return (
      (positions && scale ? Number(scale(item.value)) : Number(viewBox.y)) - 10
    );
  });
  const ys = averageBadgePositions(
    desired,
    columns,
    plot.y + 2,
    plot.y + plot.height - 22,
  );
  const y = ys[index] ?? Math.max(plot.y + 2, Number(viewBox.y) - 10);
  const lineY = Number(viewBox.y);
  return (
    <g
      aria-label={`Average ${value}`}
      className="chart-average-label"
      pointerEvents="none"
    >
      {Math.abs(y + 10 - lineY) > 4 && (
        <path
          d={`M ${x + pillWidth - 7} ${lineY} V ${y + 10}`}
          stroke={color}
          strokeWidth={1}
          strokeDasharray="2 2"
          opacity={0.7}
        />
      )}
      <rect x={x} y={y} width={pillWidth} height={20} rx={10} fill={color} />
      <text
        ref={textRef}
        x={x + 7}
        y={y + 14}
        style={{
          fill: "#fff",
          fontSize: 11,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
        <tspan style={{ fontWeight: 500 }}> avg</tspan>
      </text>
    </g>
  );
}

/** Right-align compact badges, measure their text and separate colliding averages. */
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
