# Day detail brand and design-system alignment

1 October 2026. Implements explicit browser comments; date-picker and sleep-stage design directions remain selectable proposals.

- Day readings now reuse Card and MetricDelta with Overview's hierarchy. Previous 30-calendar-day average and recorded-day count are available in a keyboard-focusable tooltip. Deltas are neutral; partial-day activity is not framed as failure.
- Readiness & Heart, Sleep and Activity use the same section navigation as Trends. Readiness contributors and temperature move out of Sleep. Contributor bars use their category color.
- Score cards in Overview and Day detail use relevant icons. Desktop navigation uses a sphere beneath the active item. Profile is an accessible orb icon on mobile and desktop.
- Today explicitly chooses today's date, preserving honest empty states when newest records are older. Initial load still chooses the newest available record.
- Intraday charts share DS horizontal grid, numeric axes, active-dot and right-aligned average badge. Vertical clock grid added. An average outside current readings extends the domain so its label stays visible.
- Night charts and stages share a timestamp cursor and common bedtime/wake domain. Daytime HR and MET share a separate cursor. Values are nearest samples within five minutes, with actual sample time shown when different. Null gaps, out-of-range times and distant samples remain “No sample.” No hourly aggregate comparison introduced.
- Sleep-stage lanes are tighter, without artificial rounded gaps between adjacent intervals, with clock labels and keyboard/pointer time readout. Requested explanatory footer removed. Broader redesign remains a proposal.
- Transparent navigation logo is versioned in public/brand/v1.1 and centralized in brand-config. Original symbol bitmap and outlined wordmark are preserved inside a hybrid SVG. Opaque launcher/social canvases are unchanged. Full vector reconstruction is not claimed.

## Proposals

Portable gallery: docs/brand/day-detail-proposals-2026-10-01/index.html. A/B/C day navigation and 1/2/3 sleep stages can be mixed independently. Synthetic data, explicitly fixed during date browsing. Prior explorations preserved. No variant selected or promoted to production.

## Verification

Lint/typecheck; 125 unit tests including gap-safe timestamp lookup. Chromium/WebKit day tests cover actual Today with stale newest data, missing optional permissions, fresh activity refresh, section grouping, cross-chart cursor via keyboard and pointer, stage keyboard interaction, mobile overflow and accessibility at 390/1440px. Broader product/profile/PWA and charts/onboarding suites also checked. Build and isolated static Worker bundle validated before release.
