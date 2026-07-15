# Changelog

All notable changes to Woura. Format follows [Keep a Changelog](https://keepachangelog.com/),
versioning follows [SemVer](https://semver.org/) — MAJOR.MINOR.PATCH.

## [0.1.0] — 2026-07-15

First working release. 🎉

### Added
- OAuth2 sign-in with Oura; tokens live only in the browser, auto-refresh
- Stateless no-log API proxy (CORS workaround), IndexedDB cache (30-min TTL)
- **Dashboard**: score cards, insight cards (30-day window vs your whole
  history, percentile verdicts), score trends, distributions, "this month vs
  last" slope chart, weekly report, milestones & streaks, weekday profile,
  baseline shift detection
- **Trends**: full-history default range, daily/weekly/monthly/quarterly
  aggregation, brush timeline, ~32 metrics, ±1σ baseline bands, tag summary,
  correlation matrix (Pearson r)
- **Year**: ring year, calendar heatmap, sleep-rhythm barcode
- **Tag Lab**: next-day impact of your tags vs all other days
- Export (CSV/JSON, human units, date & metric filters)
- ⌘K command palette, onboarding card, privacy footer with local-data wipe
- Light editorial theme, Plus Jakarta Sans, shadcn/ui, colorblind-validated
  chart palettes, keyboard-browsable visualizations
