import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarBoundaries, minorGridCoordinates } from '../src/lib/chart-presentation.ts';
import { dayNumber as n, dayString, inclusiveDays, moveDateWindow, snapToQuarter } from '../src/lib/date-selection.ts';
test('calendar boundaries distinguish years and quarters over leap years', () => {
  assert.deepEqual(calendarBoundaries('2023-12-31','2024-04-01'), [{day:'2024-01-01',kind:'year'},{day:'2024-04-01',kind:'quarter'}]);
  assert.equal(inclusiveDays('2024-02-28','2024-03-01'), 3);
  assert.equal(inclusiveDays('2026-03-28','2026-03-30'), 3);
  assert.equal(dayString(n('2026-09-30')), '2026-09-30');
});
test('whole-window movement preserves length at both history edges', () => {
  assert.deepEqual(moveDateWindow(30,59,-80,0,364),[0,29]);
  assert.deepEqual(moveDateWindow(30,59,900,0,364),[335,364]);
});
test('quarter attraction is narrow and inclusive end dates use quarter end', () => {
  const min=n('2025-01-01'), max=n('2026-09-30');
  assert.equal(snapToQuarter(n('2026-04-02'),'start',min,max,600),n('2026-04-01'));
  assert.equal(snapToQuarter(n('2026-03-30'),'end',min,max,600),n('2026-03-31'));
  assert.equal(snapToQuarter(n('2026-04-06'),'start',min,max,300),null);
  assert.equal(snapToQuarter(n('2026-03-28'),'start',min,max,300),null);
  assert.equal(snapToQuarter(n('2026-09-29'),'end',min,max,600),n('2026-09-30'));
});
test('two minor grid lines fall strictly between every adjacent major tick', () => {
  assert.deepEqual(minorGridCoordinates([90,0,60,30]),[10,20,40,50,70,80]);
  assert.deepEqual(minorGridCoordinates([0,0,30]),[10,20]);
});
