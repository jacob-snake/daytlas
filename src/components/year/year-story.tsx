"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import type { DayRow } from "@/lib/oura/metrics";
import { localDay } from "@/lib/dates";
import { sleepDuration } from "@/lib/profile-summary";
import { yearStory } from "@/lib/year-story";
import styles from "./year-story.module.css";

const titles = [
  "Days become patterns.",
  "Your own average.",
  "Different seasons. Same you.",
  "Weekdays and weekends.",
  "A little more perspective.",
];
const dayLabel = (day: string | null) =>
  day
    ? new Date(`${day}T00:00:00Z`).toLocaleDateString("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "No record";

export function YearStory({ rows, year }: { rows: DayRow[]; year: number }) {
  const [chapter, setChapter] = useState(0);
  const today = localDay();
  const story = useMemo(
    () => yearStory(rows, year, today),
    [rows, year, today],
  );
  const quarterMax = Math.max(1, ...story.quarters.map((q) => q.average ?? 0));
  const panels = [
    <div key="days">
      <p>One dot for each elapsed day. Missing nights remain visible.</p>
      <div
        className={styles.dots}
        role="img"
        aria-label={`${story.days.length} elapsed days: ${story.count} recorded nights and ${story.missing} without a sleep record. Dot intensity indicates sleep duration, from zero to 12 hours; longer records use the brightest shade.`}
      >
        {story.days.map((d) => (
          <i
            key={d.day}
            className={d.hours === null ? styles.missing : undefined}
            style={
              d.hours === null
                ? undefined
                : { opacity: 0.25 + 0.75 * Math.min(d.hours / 12, 1) }
            }
          />
        ))}
      </div>
      <p className={styles.note}>
        {story.count} nights recorded · {story.missing} days without a sleep
        record
      </p>
      <p className={styles.note}>
        Brighter blue means longer sleep, up to 12 hours. An outlined dot means
        no sleep reading.
      </p>
    </div>,
    <div key="average">
      <div className={styles.heroValue}>{sleepDuration(story.average)}</div>
      <p>Average main-sleep duration, from {story.count} recorded nights.</p>
      <p className={styles.note}>
        Missing nights are excluded, never counted as zero. Naps are not
        included in this measure.
      </p>
    </div>,
    <div key="seasons">
      <p>Average main sleep in each quarter, using the nights available.</p>
      <div className={styles.quarters}>
        {story.quarters.map((q, i) => (
          <div key={i} className={styles.quarter}>
            <span className={styles.barTrack} aria-hidden="true">
              <i
                style={{ height: `${((q.average ?? 0) / quarterMax) * 100}%` }}
              />
            </span>
            <strong>Q{i + 1}</strong>
            <span>
              {q.average === null ? "No records" : sleepDuration(q.average)}
            </span>
            <small>{q.count} nights</small>
          </div>
        ))}
      </div>
      <p className={styles.note}>
        Bars start at zero and share one scale. Coverage varies across quarters;
        future dates are not missing data. A difference does not explain its
        cause.
      </p>
    </div>,
    <div key="week">
      <div className={styles.comparison}>
        {[
          ["Monday–Friday", story.weekdays],
          ["Saturday–Sunday", story.weekends],
        ].map(([label, values]) => {
          const group = values as typeof story.weekdays;
          return (
            <div key={label as string}>
              <p>{label as string}</p>
              <div className={styles.value}>{sleepDuration(group.average)}</div>
              <p className={styles.note}>{group.count} recorded nights</p>
            </div>
          );
        })}
      </div>
      <p className={styles.note}>
        Grouped by the record date, not your personal work schedule. Longer
        sleep does not automatically mean a better result.
      </p>
    </div>,
    <div key="perspective">
      {story.longest ? (
        <div className={styles.highlight}>
          <p>Longest recorded main sleep</p>
          <div className={styles.value}>
            {sleepDuration(story.longest.hours)}
          </div>
          <p>{dayLabel(story.longest.day)}</p>
        </div>
      ) : (
        <p>No main-sleep records are available for this period yet.</p>
      )}
      <p>
        {story.first
          ? `Your available sleep history here runs from ${dayLabel(story.first)} to ${dayLabel(story.latest)}.`
          : "Your year will take shape as readings become available."}
      </p>
      <p className={styles.note}>
        This describes your available records, not a medical assessment. Your
        story stays here; nothing is shared automatically.
      </p>
    </div>,
  ];
  return (
    <section
      className={styles.story}
      aria-label={`Your ${year} sleep story`}
      data-testid="year-story"
    >
      <div className={styles.chapters} role="group" aria-label="Story chapters">
        {titles.map((title, i) => (
          <button
            key={title}
            type="button"
            aria-label={`Chapter ${i + 1}: ${title}`}
            aria-pressed={chapter === i}
            onClick={() => setChapter(i)}
          >
            <span />
          </button>
        ))}
      </div>
      <p className={styles.period}>
        Your {year} · {dayLabel(story.start)} – {dayLabel(story.end)}
      </p>
      <div className={styles.stage}>
        {titles.map((title, i) => (
          <div
            className={styles.panel}
            key={title}
            aria-hidden={chapter !== i}
            inert={chapter !== i}
            data-active={chapter === i}
          >
            <Typography as="h2" variant="heading" className={styles.title}>
              {title}
            </Typography>
            {panels[i]}
          </div>
        ))}
      </div>
      <div className={styles.controls}>
        <Button
          variant="secondary"
          size="sm"
          disabled={chapter === 0}
          onClick={() => setChapter((c) => c - 1)}
        >
          Back
        </Button>
        <span aria-live="polite" aria-atomic="true">
          {chapter + 1} / 5<span className="sr-only">: {titles[chapter]}</span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setChapter((c) => (c === 4 ? 0 : c + 1))}
        >
          {chapter === 4 ? "Start again" : "Next"}
        </Button>
      </div>
    </section>
  );
}
