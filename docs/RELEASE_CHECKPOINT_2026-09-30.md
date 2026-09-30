# Me by Day application checkpoint

This is a source checkpoint of the application state preceding the 30 September daily-detail research. It is a draft for review, not a merge or deployment instruction.

## Included

- Me by Day application routes, design system, Overview, Trends, Year and Tag Lab.
- Shared timeline/date selection, expanded metric comparisons with distinct series colors and pairwise correlation summaries.
- Browser-local Oura CSV/ZIP imports and synthetic demo fixtures.
- OAuth relay, account adapter and native static Worker source; account and analytics services remain disabled by default.
- Build/release tooling, example configuration, schema and automated tests.

No personal health exports, credentials, user screenshots, DNS backups or internal research/design archives are included. Previously tracked repository documents remain as they were; the local editorial/design documentation is outside this application checkpoint.

The new “How to read this” accordion, cardiovascular-age view, daily detail and metric education proposals are excluded. New product work must be discussed before publication.

## Validation

An isolated export of the staged Git tree was installed with `npm ci`, then passed `npm run check` (lint, TypeScript and 106 unit tests) and `npm run build` on Node 24.

The broader Chromium/WebKit browser suite is **not green**. It reports failures in existing design-system, navigation and onboarding assertions, including an expected font weight of 600 after the interface changed. Remaining failures need individual triage; they must not all be assumed to be stale tests. This checkpoint is not ready to merge on the basis of browser coverage.

Production previously deployed the corresponding static application as release `610b2341-82dd-4528-b068-ce17404dfa9d`. No deployment is part of this checkpoint. Environment values remain external to Git.
