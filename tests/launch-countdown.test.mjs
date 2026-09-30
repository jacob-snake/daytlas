import assert from 'node:assert/strict';
import test from 'node:test';
import { freePeriodRemaining, launch } from '../src/lib/launch-config.ts';
test('free period includes all of October in Prague after DST change', () => {
  assert.equal(new Date(launch.freeUntil).toISOString(), '2026-10-31T23:00:00.000Z');
  assert.deepEqual(freePeriodRemaining(Date.parse('2026-10-31T22:59:00Z')), {expired:false,days:0,hours:0,minutes:1});
  assert.deepEqual(freePeriodRemaining(Date.parse('2026-10-31T23:00:00Z')), {expired:true,days:0,hours:0,minutes:0});
  assert.equal(freePeriodRemaining(Date.parse('2026-11-02T00:00:00Z')).days,0);
  assert.deepEqual(freePeriodRemaining(Date.parse('2026-10-30T23:00:00Z')), {expired:false,days:1,hours:0,minutes:0});
});
