import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RingYear } from "../src/components/year/ring-year.tsx";
import { YearHeatmap } from "../src/components/year/heatmap.tsx";
import { SleepBarcode } from "../src/components/year/sleep-barcode.tsx";

const render = (component, props) =>
  renderToStaticMarkup(createElement(component, props));

test("year charts render empty and constant histories without invalid domains", () => {
  for (const component of [RingYear, YearHeatmap]) {
    const empty = render(component, {
      year: 2024,
      metricKey: "sleep_score",
      rows: [],
    });
    assert.doesNotMatch(empty, /Infinity|NaN/);
    const constant = render(component, {
      year: 2024,
      metricKey: "sleep_score",
      rows: [{ day: "2024-04-01", sleep_score: 80 }],
    });
    assert.match(constant, /#4a80ec/); // constant readings still get a visible value color
  }
});

test("leap year heatmap places the Monday after DST in the correct calendar column", () => {
  const oldTimezone = process.env.TZ;
  try {
    process.env.TZ = "Europe/Prague";
    const html = render(YearHeatmap, {
      year: 2024,
      metricKey: "sleep_score",
      rows: [{ day: "2024-04-01", sleep_score: 80 }],
    });
    assert.equal((html.match(/<rect /g) ?? []).length, 366);
    assert.match(
      html,
      /<rect[^>]*x="221" y="0"[^>]*><title>2024-04-01: 80<\/title>/,
    );
    const ring = render(RingYear, {
      year: 2024,
      metricKey: "sleep_score",
      rows: [],
    });
    assert.equal((ring.match(/<line /g) ?? []).length, 366);
    assert.match(ring, /aria-live="polite"/);
  } finally {
    if (oldTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = oldTimezone;
  }
});

test("sleep barcode preserves date gaps and same-day sleep within its clock domain", () => {
  const html = render(SleepBarcode, {
    rows: [
      { day: "2024-04-01", bedtime: 13, wakeup_time: 15, sleep_score: 80 },
      { day: "2024-04-04", bedtime: 23, wakeup_time: 7, sleep_score: 80 },
    ],
  });
  assert.match(html, /<rect[^>]*x="44"[^>]*y="0"/);
  const marks = [
    ...html.matchAll(/<rect[^>]*data-day="([^"]+)"[^>]* x="([^"]+)"/g),
  ];
  const width = Number(html.match(/viewBox="0 0 ([\d.]+) /)[1]);
  // Three elapsed days in a four-day domain, even when the chart expands.
  assert.equal(
    (Number(marks[1][2]) - Number(marks[0][2])) / (width - 44),
    3 / 4,
  );
  assert.doesNotMatch(html, /Infinity|NaN/);
  assert.match(render(SleepBarcode, { rows: [] }), /No sleep timing/);
});
