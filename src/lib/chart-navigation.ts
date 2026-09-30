/** Reveal a keyboard-selected mark by scrolling only its chart, never the page. */
export function revealChartMark(
  container: HTMLElement | null,
  mark: SVGGraphicsElement | null,
) {
  if (!container || !mark) return;
  const viewport = container.getBoundingClientRect();
  const bounds = mark.getBoundingClientRect();
  const inset = 8;
  const left = viewport.left + container.clientLeft + inset;
  const right =
    viewport.left + container.clientLeft + container.clientWidth - inset;
  if (bounds.left < left) container.scrollLeft -= left - bounds.left;
  else if (bounds.right > right) container.scrollLeft += bounds.right - right;
}
