import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonColors, comparisonPairs } from '../src/lib/chart-comparison.ts';
import { METRICS } from '../src/lib/oura/metrics.ts';

test('same-category and mixed-category comparisons never duplicate any of four colors', () => {
  for (const base of METRICS) {
    for (let i = 0; i < METRICS.length - 2; i++) {
      const keys = [...new Set([base.key, ...METRICS.slice(i, i + 3).map(m => m.key)])];
      const colors = comparisonColors(keys);
      assert.equal(new Set(Object.values(colors)).size, keys.length);
      assert.equal(colors[base.key], comparisonColors([base.key])[base.key]);
    }
  }
  assert.equal(new Set(Object.values(comparisonColors(['sleep_score', 'time_in_bed', 'total_sleep', 'deep_sleep']))).size, 4);
});

test('correlations use paired finite observations and include every unique pair', () => {
  const rows = Array.from({length: 7}, (_, i) => ({day: `2026-01-0${i+1}`, a: i, b: 2*i, c: 10-i}));
  rows[0].a = null;
  rows[1].b = NaN;
  const pairs = comparisonPairs(rows, ['a', 'b', 'c']);
  assert.equal(pairs.length, 3);
  assert.deepEqual(pairs[0].stat, {r: 1, n: 5});
  assert.equal(pairs[1].stat.r, -1);
  assert.equal(pairs[1].stat.n, 6);
  assert.equal(pairs[2].stat.n, 6);
});

test('insufficient data, constant values and clock metrics do not produce misleading r values', () => {
  const rows = Array.from({length: 6}, (_, i) => ({day: `2026-01-0${i+1}`, a: i, b: 2, bedtime: 23+i/10}));
  assert.equal(comparisonPairs(rows.slice(0,4), ['a','b'])[0].stat, null);
  assert.match(comparisonPairs(rows.slice(0,4), ['a','b'])[0].reason, /5 paired/);
  assert.match(comparisonPairs(rows, ['a','b'])[0].reason, /variation/);
  assert.match(comparisonPairs(rows, ['a','bedtime'])[0].reason, /midnight/);
  assert.equal(comparisonPairs([], ['a','b'])[0].stat, null);
});
