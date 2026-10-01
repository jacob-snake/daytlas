# Daytlas brand components

Approved 1 October 2026: Mist Light / pure white symbol and outlined Onest 550 wordmark, final v1.0. The app body font remains its existing design-system font.

- `src/lib/brand-config.ts` is the public identity and asset-path source. Change name/domain and versioned artwork paths here; never derive storage identifiers from presentation branding.
- `Brand` is the accessible home link used by public/app navigation and footers. `revealWebsite` retains the existing keyboard-accessible back-to-website interaction and respects reduced motion.
- `BrandLogo` renders the complete approved composition at 160×64 plus 0.1H clear space on a transparent background. Below 640px it uses the approved outlined wordmark at 104px. It is decorative inside the named link.
- `BrandMark` is the approved symbol, decorative by default, at 48px, using the transparent SVG symbol. Give its parent an accessible name when used as a control.
- Transparent navigation artwork lives in `public/brand/v1.1`; the original `v1` exports remain intact. The user explicitly requested removal of the white plate on 1 October. Hybrid SVG preserves original raster sphere pixels with a native silhouette clip and the original vector wordmark; it is not a fully vector redraw. Replace assets and central paths together.
- Metadata and PWA routes serve the exact supplied size-specific PNG exports. The supplied favicon is served from `public/favicon.ico`; do not put it through Next's ICO decoder, which rejects its embedded RGB PNG. Root metadata explicitly declares favicon and Apple icon.
- The social preview embeds the supplied full PNG. No external font or image request is needed to render the logo.

Canonical design package: `docs/brand/daytlas-final-v1.0/` in the maintained workspace. Production assets are checked into Git independently of exploratory design files. Browser tests verify served home-screen bytes against these assets, navigation, accessibility, and 320/390px layouts.
