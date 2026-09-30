import { isDay, shiftDay } from "./dates";

export interface GoalVersion {
  effectiveDay: string;
  targetMinutes: number | null;
}
export interface LocalPreferences {
  version: 1;
  completed: boolean;
  goals: GoalVersion[];
}
export const emptyPreferences = (): LocalPreferences => ({
  version: 1,
  completed: false,
  goals: [],
});
// Retain the existing storage namespace so disconnect-and-clear erases these too.
export const preferencesKey = (scope: string) =>
  `woura.preferences.v1.${scope}`;
export function validTarget(minutes: unknown): minutes is number {
  return (
    typeof minutes === "number" &&
    Number.isInteger(minutes) &&
    minutes >= 240 &&
    minutes <= 720 &&
    minutes % 15 === 0
  );
}
export function parsePreferences(raw: string | null): LocalPreferences {
  try {
    const value = JSON.parse(raw ?? "null");
    if (
      value?.version !== 1 ||
      typeof value.completed !== "boolean" ||
      !Array.isArray(value.goals) ||
      value.goals.length > 1000
    )
      return emptyPreferences();
    const goals: GoalVersion[] = [];
    for (const goal of value.goals) {
      if (
        !isDay(goal?.effectiveDay) ||
        (goal.targetMinutes !== null && !validTarget(goal.targetMinutes))
      )
        return emptyPreferences();
      if (goals.length && goal.effectiveDay <= goals.at(-1)!.effectiveDay)
        return emptyPreferences();
      goals.push({
        effectiveDay: goal.effectiveDay,
        targetMinutes: goal.targetMinutes,
      });
    }
    return { version: 1, completed: value.completed, goals };
  } catch {
    return emptyPreferences();
  }
}
/** A change starts tomorrow: even today's existing results retain their target. */
export function updateGoal(
  previous: LocalPreferences,
  minutes: number | null,
  today: string,
): LocalPreferences {
  if (!isDay(today) || (minutes !== null && !validTarget(minutes)))
    throw new Error("Choose a duration from 4 to 12 hours in 15-minute steps.");
  const effectiveDay = previous.goals.length ? shiftDay(today, 1) : today;
  const goals = previous.goals.filter(
    (goal) => goal.effectiveDay < effectiveDay,
  );
  goals.push({ effectiveDay, targetMinutes: minutes });
  return { version: 1, completed: true, goals };
}
export function targetForDay(
  preferences: LocalPreferences,
  day: string,
): number | null {
  return (
    preferences.goals.findLast((goal) => goal.effectiveDay <= day)
      ?.targetMinutes ?? null
  );
}
export function goalProgress(
  rows: { day: string; [key: string]: unknown }[],
  preferences: LocalPreferences,
  today: string,
) {
  const start = shiftDay(today, -6);
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (
      isDay(row.day) &&
      row.day >= start &&
      row.day <= today &&
      typeof row.total_sleep === "number" &&
      Number.isFinite(row.total_sleep) &&
      row.total_sleep > 0 &&
      row.total_sleep <= 24
    )
      byDay.set(row.day, row.total_sleep * 60);
  }
  let eligible = 0,
    recorded = 0,
    met = 0;
  for (let index = 0; index < 7; index++) {
    const day = shiftDay(start, index);
    const target = targetForDay(preferences, day);
    if (target === null) continue;
    eligible++;
    const duration = byDay.get(day);
    if (duration !== undefined) {
      recorded++;
      if (duration >= target) met++;
    }
  }
  return { eligible, recorded, met, missing: eligible - recorded };
}
