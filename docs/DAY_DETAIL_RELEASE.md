# Day detail and Trends release — 30 September 2026

Approved scope: add Day detail without removing Overview content, select date-toolbar variant A, use shared design-system menus, move chart removal to the upper-right corner, repair checks and deploy.

## Product structure

| Information | Overview | Day detail |
| --- | --- | --- |
| Readiness, Sleep, Activity scores | Latest available, previous seven days | Selected day, previous 30 calendar days |
| Sleep duration, HRV, resting heart rate, temperature, steps | Historical charts and summaries | Daily readings and prior 30-day baseline with coverage |
| Cardiovascular age | Latest Oura estimate, baseline and history | Not duplicated |
| Sleep phases and within-night HRV/HR | Not shown | Selected sleep episode; main-night baseline |
| Intraday heart rate and MET | Not shown | Local-day plots, missing-sample gaps |
| Score contributors and activity durations | Not shown as daily breakdown | Selected-day breakdown |
| Distribution, weekday effects, shifts, milestones, correlations | Preserved | Not duplicated |

Day detail lives at `/app/day`; navigation and command palette include it. It reuses the application header, footer, score cards, cards, buttons, inputs, Radix DS selects and chart components. No standalone prototype is shipped. Times follow the device timezone. Oura assigns sleep episodes to a calendar day. Today is explicitly incomplete; steps and energy remain comparable with full-day historical averages, with neutral context rather than a final-day judgement.

## Data and limitations

The daily collections and sleep periods load independently from optional heart-rate samples. `/v2/usercollection/heartrate` uses five bounded date-time requests covering the selected day and preceding 30 calendar days, with existing pagination, session isolation and local cache. Existing approved scopes and proxy allowlists suffice. No new service, database, telemetry or permission scope.

Baselines exclude the selected day, deduplicate dates, show available-day counts, and require five valid days. Overnight HRV and HR compare the Oura main-sleep daily average values. The daytime resting average includes awake/rest samples only; sampling coverage varies. Cumulative steps and calories are compared with full previous days, not claimed to be a same-time-of-day comparison.

Initial latest-day selection searches the last 60 days. Older dates can be selected explicitly; their preceding 30 days are fetched too. Imports may supply daily aggregates but not sample series; missing series are disclosed. Optional endpoint failures leave other daily data usable. Live-account sample availability has not been verified; tests and visual checks use invented demo/mocked data.

## Verification

112 unit tests pass, TypeScript passes, lint has no errors. Full Chromium and WebKit suite: 126 pass, two pre-existing analytics opt-in tests skipped because analytics is disabled. Coverage includes 320/390/768/1440 layouts, serious/critical accessibility checks, session preservation, stale history responses, real-format synthetic export, keyboard controls, nightly series and optional heart-rate failure.

Fixed actual accessibility naming errors in chart containers and repeated table landmarks; repaired calendar overflow at 320px. Updated obsolete test assumptions about header navigation, export location, period/date controls and demo return links. The history race test now exercises the current single-history-fetch architecture instead of waiting for requests that no longer exist.

Accessibility checks run per page so slower CI WebKit runs keep the same coverage without sharing one 30-second timeout across eight pages. Expired Oura credentials keep their original error classification and offer reconnection; optional sample failures do not hide nightly data.
