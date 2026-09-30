import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyPreferences,
  parsePreferences,
  preferencesKey,
  updateGoal,
  goalProgress,
  targetForDay,
  validTarget,
} from "../src/lib/onboarding.ts";

test("preferences reject corrupted, unknown-version, duplicate-day and invalid target state", () => {
  for (const raw of [
    "broken",
    JSON.stringify({ version: 2, completed: true, goals: [] }),
    JSON.stringify({
      version: 1,
      completed: true,
      goals: [{ effectiveDay: "2026-02-30", targetMinutes: 450 }],
    }),
    JSON.stringify({
      version: 1,
      completed: true,
      goals: [{ effectiveDay: "2026-09-27", targetMinutes: 60 }],
    }),
    JSON.stringify({
      version: 1,
      completed: true,
      goals: [
        { effectiveDay: "2026-09-27", targetMinutes: 450 },
        { effectiveDay: "2026-09-27", targetMinutes: 480 },
      ],
    }),
  ])
    assert.deepEqual(parsePreferences(raw), emptyPreferences());
  assert.equal(validTarget(450), true);
  assert.equal(validTarget(451), false);
  assert.equal(validTarget(NaN), false);
  assert.throws(() => updateGoal(emptyPreferences(), 180, "2026-09-27"));
});
test("round-trips settings with separate demo/connection keys and no email fields", () => {
  const prefs = updateGoal(emptyPreferences(), 450, "2026-09-27");
  assert.deepEqual(parsePreferences(JSON.stringify(prefs)), prefs);
  assert.notEqual(preferencesKey("demo"), preferencesKey("live:abc"));
  assert.notEqual(preferencesKey("live:abc"), preferencesKey("live:def"));
  assert.deepEqual(Object.keys(prefs), ["version", "completed", "goals"]);
});
test("goal edits take effect tomorrow without rewriting earlier success or creating same-day versions", () => {
  let prefs = updateGoal(emptyPreferences(), 450, "2026-09-24");
  prefs = updateGoal(prefs, 480, "2026-09-25");
  prefs = updateGoal(prefs, 495, "2026-09-25");
  assert.equal(prefs.goals.length, 2);
  assert.equal(targetForDay(prefs, "2026-09-23"), null);
  assert.equal(targetForDay(prefs, "2026-09-25"), 450);
  assert.equal(targetForDay(prefs, "2026-09-26"), 495);
  prefs = updateGoal(prefs, null, "2026-09-26");
  assert.equal(targetForDay(prefs, "2026-09-27"), null);
});
test("progress excludes missing/invalid/future/duplicate records and applies each day's goal", () => {
  let prefs = updateGoal(emptyPreferences(), 450, "2026-09-24");
  prefs = updateGoal(prefs, 480, "2026-09-25");
  assert.deepEqual(
    goalProgress(
      [
        { day: "2026-09-23", total_sleep: 10 },
        { day: "2026-09-24", total_sleep: 7.5 },
        { day: "2026-09-24", total_sleep: 8 },
        { day: "2026-09-25", total_sleep: null },
        { day: "2026-09-26", total_sleep: 7.75 },
        { day: "2026-09-27", total_sleep: NaN },
        { day: "2026-09-28", total_sleep: 10 },
        { day: "2026-09-99", total_sleep: 9 },
      ],
      prefs,
      "2026-09-27",
    ),
    { eligible: 4, recorded: 2, met: 1, missing: 2 },
  );
});
