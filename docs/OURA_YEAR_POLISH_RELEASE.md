# Oura data and year-chart follow-up — 30 September 2026

## Behavior

- OAuth requests the `heart_health` permission required by cardiovascular age. Existing connections need reconnect/consent. The CVA card distinguishes authorization failure and offers reconnection. This does not prove individual account data availability before reauthorization.
- Timestamp-backed activity/sleep/workout/session collections request the following day as the exclusive endpoint, then filter to the user's inclusive calendar range. The cache namespace changes to prevent reuse of incomplete ranges; explicit Day detail refresh fetches fresh daily collections.
- Missing activity displays sync/refresh guidance instead of unexplained empty totals. Historical averages remain independent.
- Year heatmap and sleep barcode expand to the card width. Both expose anchored pointer, touch and keyboard tooltips; Escape dismisses. Calendar gaps and mobile horizontal navigation remain intact. Average sleep times use a circular mean across midnight.
- Trends correlation values use the product font, reading help is a lightweight disclosure, and the date-range button has a smaller radius.
- The shared footer includes a feedback dialog that opens an email draft. No message is sent automatically; server email delivery is not configured.

## Profile and hourly comparison — proposed only

Three profile variants are retained in `docs/brand/profile-proposals-2026-09-30/`. No unselected profile redesign is deployed. Future Premium features and personal goals are locked in those proposals, with a planned late-October 2026 release. Moving the monthly view to Your year awaits layout selection.

The Oura schema provides historical timestamped MET/activity classifications and HR but only daily steps and calorie totals. Exact same-hour historical steps/calories require snapshots that do not currently exist. No proportional estimate or hourly comparison is introduced by this release.

Sources: [Oura OpenAPI 1.41](https://cloud.ouraring.com/v2/static/json/openapi-1.41.json), [Oura activity/sleep/calendar day definitions](https://partnersupport.ouraring.com/hc/en-us/articles/29160913203219-Understanding-the-Different-Types-of-Oura-Days-in-Oura-API-Data).

## Verification

TypeScript, lint (no errors; four existing warnings), 116 unit tests. Full browser suite: 132 passed, two existing analytics-disabled skips, Chromium and WebKit. Isolated production build, static export and Worker bundling dry run passed. Browser visual checks use synthetic demo data. Production health and live activity verification are recorded after deployment; CVA needs owner re-consent first.
