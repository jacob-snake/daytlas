# Daytlas — approved Orbit on the website

1 October 2026. The user explicitly selected **Orbit v4 as final** and authorized adding it to the website with a longer pause.

- Approved motion unchanged: 3.6 s, outer orbital arc 85° at full occlusion, inner spheres move radially, central pulse +10%.
- Website cadence: 4 s initial quiet state, then one 3.6 s cycle and 12 s static pause before each repeat.
- Shared logo on homepage, app and document headers/footers; full symbol and wordmark also shown on narrow screens.
- All 19 spheres stay opaque blue. Static artwork, colors and Onest wordmark unchanged. No background gradient.
- Reduced-motion preference always shows original static artwork. Leaving the viewport or hiding the tab cancels motion; returning starts with a quiet interval. Image decode failure leaves the static fallback.
- No external animation dependencies. WAAPI transforms use the exact v4 Orbit path; wordmark remains stationary. The approved raster is shared by native SVG masks.

Source: `src/components/brand-orbit.tsx`, `src/lib/brand-orbit.ts`, and `public/brand/v1.2/motion/orbit-source.png`. Original exploration is preserved in the canonical checkout under `docs/brand/daytlas-breathing-motion-v4-2026-10-01/`.

Browser coverage: real 12-second pause, recurrence, reduced-motion switching, offscreen cancellation and 320px homepage/app headers in Chromium and WebKit. Release/deployment evidence is maintained in the local continuity handoff and retained release directory.
