# Selected Day, profile and product presentation — 1 October 2026

User selected Profile A with the blue Premium header from C. This implementation also addresses the twenty annotated Day/Trends comments and adds five homepage views plus the supplied temporary film. Earlier profile and day proposal galleries are retained alongside this directory.

Runtime sources: `src/components/marketing/`, `src/components/day-detail/`, `src/components/ui/floating-controls.tsx`, `src/components/ui/category-icon.tsx`, `src/app/app/profile/page.tsx` and `src/components/year/month-overview.tsx`. Run the repository app to review the interactive implementation. Screenshots here use fictional demo data only.

- Day: shared calendar, orb selection, floating previous/next/today; consistent icons and comparison copy, paired small metrics, tooltip-only readings and legible average labels.
- Profile: selected A structure, C blue header, planned Premium functions clearly unavailable; functional personal-goal setup retained.
- Your year: existing twelve-month selector and summaries relocated from Profile.
- Homepage: existing hero retained, five selectable sample illustrations; silent video with pause and reduced-motion support.
- Film: public/media/product-tour-2026-10-01.mp4 is a 1280x720, audio-free derivative (~3.8MB) of the user-supplied 100.5-second film. Branding/UI remain an explicitly temporary earlier version. Replace media and poster when final film arrives. Original source is untouched.

Validation:127 unit tests, lint/typecheck and Next build pass.40 focused Chromium/WebKit tests pass;22 rerun after final keyboard-tooltip/media refinements pass. Browser visual evidence covers tablet avatar/Day, desktop Profile and graph tooltip. Byte-range media delivery verified separately before deployment. No user health data or credentials are stored here.
