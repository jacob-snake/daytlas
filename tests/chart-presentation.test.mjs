import test from 'node:test';
import assert from 'node:assert/strict';
import { averageBadgePositions } from '../src/lib/chart-presentation.ts';

function assertFits(positions, columns, top, bottom) {
  positions.forEach(y => assert.ok(y >= top && y <= bottom));
  for (let col = 0; col < columns; col++) {
    const ys = positions.filter((_, i) => i % columns === col).sort((a, b) => a - b);
    ys.slice(1).forEach((y, i) => assert.ok(y - ys[i] >= 28));
  }
}

test('nearby averages on two unit axes do not overlap in one mobile column', () => {
  const desired = [142, 155];
  const positions = averageBadgePositions(desired, 1, 12, 200);
  assertFits(positions, 1, 12, 200);
  assert.deepEqual(desired, [142, 155]);
});

test('up to four badges stay inside the plot at either boundary', () => {
  for (const desired of [[-30, -30, -30, -30], [300, 300, 300, 300], [100, 90, 110, 95]]) {
    for (const columns of [1, 2, 4]) {
      assertFits(averageBadgePositions(desired, columns, 12, 132), columns, 12, 132);
    }
  }
});

test('well separated averages retain their original positions', () => {
  assert.deepEqual(averageBadgePositions([30, 100, 170], 1, 12, 200), [30, 100, 170]);
});
