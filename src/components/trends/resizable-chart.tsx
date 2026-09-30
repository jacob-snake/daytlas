"use client";

import { useId, useRef, useState, type ReactNode } from "react";

const MIN_HEIGHT = 220;
const MAX_HEIGHT = 760;
const clamp = (height: number) =>
  Math.round(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height)));

export function ResizableChart({
  label,
  children,
}: {
  label: string;
  children: (height: number) => ReactNode;
}) {
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; y: number; height: number } | null>(null);
  const description = useId();
  return (
    <div>
      {children(height)}
      <div
        role="separator"
        tabIndex={0}
        aria-label={`Resize ${label} chart height`}
        aria-orientation="horizontal"
        aria-valuemin={MIN_HEIGHT}
        aria-valuemax={MAX_HEIGHT}
        aria-valuenow={height}
        aria-valuetext={`${height} pixels`}
        aria-describedby={description}
        className="chart-resize-handle mt-1"
        data-dragging={dragging}
        title="Drag to resize · double-click to reset"
        onPointerDown={(event) => {
          if (event.button !== 0 || drag.current) return;
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { id: event.pointerId, y: event.clientY, height };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (start?.id === event.pointerId)
            setHeight(clamp(start.height + event.clientY - start.y));
        }}
        onPointerUp={(event) => {
          if (drag.current?.id !== event.pointerId) return;
          drag.current = null;
          setDragging(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          if (drag.current) setHeight(drag.current.height);
          drag.current = null;
          setDragging(false);
        }}
        onLostPointerCapture={() => {
          drag.current = null;
          setDragging(false);
        }}
        onDoubleClick={() => setHeight(MIN_HEIGHT)}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 60 : 20;
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            setHeight((value) =>
              clamp(value + (event.key === "ArrowDown" ? step : -step)),
            );
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            setHeight(event.key === "Home" ? MIN_HEIGHT : MAX_HEIGHT);
          } else if (event.key === "Escape" && drag.current) {
            event.preventDefault();
            setHeight(drag.current.height);
            event.currentTarget.releasePointerCapture(drag.current.id);
            drag.current = null;
            setDragging(false);
          }
        }}
      />
      <p id={description} className="sr-only">
        Drag up or down to resize. Arrow keys change height; Shift changes it
        faster. Home resets the height, End maximizes it, and Escape cancels a
        drag.
      </p>
    </div>
  );
}
