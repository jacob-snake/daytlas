# Homepage and Overview annotation pass — 2 October 2026

Requested implementation of the 19 browser comments. Existing hero, brand identity and Orbit animation remain the reference. No unrelated local documentation or skills included in this change.

## Implemented

1. Hero connection/demo helper is plain text.
2. Static film poster with Play opens a near-viewport modal, native controls, original AAC audio, user-triggered playback. Escape/close stops audio and restores focus. No film download or autoplay before opening. Original silent derivative remains for rollback; new audio derivative reuses the same H.264 video without another encode.
3. Official WHOOP 5.0 Graphite/titanium product cutout, device only, no PowerPack.
4. Four compact square wearable tiles from 640px, two columns on narrow phones to preserve readable labels.
5–6. Charcoal product showcase; shared semantic dark tokens and usage rules below.
7. Homepage navigation stays sticky; subtle elevation on scroll respects reduced motion.
8. FAQ expanded from three to seven: Oura complement, storage/clearing, export/import and planned integrations.
9. Navy AI roadmap with concrete exploration example, stronger hierarchy and explicit Coming soon.
10–11. Redundant wearable footer removed; green dot for available Oura. Independence remains in FAQ.
12. Homepage recommendations below are proposals, not implemented capabilities or endorsements.
13. Oura API sync status moved below/outside sticky app header, right aligned.
14–15. Profile uses a complete bounded head-and-shoulders glyph; hamburger gets circular stroke.
16. Cardiovascular age uses monotone interpolation without persistent dots; source readings, missing gaps and previous-30-day average unchanged.
17–18. Removed latest-available line and repeated coverage sentence from this card.
19. Local click/tap/keyboard information popover replaces external link. Explanation paraphrased from Oura's official support; no diagnosis or treatment advice.

## Dark surface system

Defined in `src/styles/design-system.css`:

| Token | Value | Role |
| --- | --- | --- |
| `--ds-surface-charcoal` | `oklch(0.24 0.012 265)` | Product demonstration: preview note, five-view showcase, film shell |
| `--ds-surface-navy` | `#152c45` | Brand narrative and future direction: purpose comparison and AI roadmap |
| `--ds-on-dark` | `#ffffff` | Primary text on either dark surface |
| `--ds-on-dark-muted` | `#c3cbd5` | Supporting text on dark surfaces |
| `--ds-on-dark-accent` | `#a8caff` | Small labels and section numbers on dark surfaces |
| `--ds-brand-blue` | `#246bd1` | Brand emphasis on light backgrounds |

Do not use pale dark-surface text tokens on white cards. Embedded product UI retains the existing light UI tokens. Chart category colors retain their existing meaning. Both dark surfaces are intentional, not interchangeable alternating decoration.

## Sources

WHOOP source: https://shop.whoop.com/us/en/collections/5-0-bands/
Original asset: https://images.us-east-2.aws.commercetools.com/1e98a82a-cbb6-4067-bee3-7ab3f4fd2555/5.0%20graphite%20and%20tit-Kux4MHhD.png
Manufacturer-hosted medium derivative saved unmodified: https://images.us-east-2.aws.commercetools.com/1e98a82a-cbb6-4067-bee3-7ab3f4fd2555/5.0%20graphite%20and%20tit-Kux4MHhD-medium.png
Local `public/images/wearables/whoop-5-band.png`, 349×400 with transparent alpha. Manufacturer retains image rights; not covered by repository code license. No generated or edited product imagery.
CVA explanation: https://support.ouraring.com/hc/en-us/articles/28451491040019-Cardiovascular-Age (read 2 October 2026).

## Homepage additions worth considering (proposals)

- One concrete walkthrough: a question → selected time range/metrics → what the visitor can see. Use clearly labelled sample data and cautious interpretation, not a promised health outcome.
- Real feedback from early users once obtained with permission. Short named quotes with the actual use case; no invented testimonials or user counts.

Pricing/early-access terms already appear on the homepage; do not invent a new plan or repeat them in another large block.

## Verification

Local lint/typecheck,127 data tests and Next build passed. Full browser suite:174 passed,2 existing analytics skips across Chromium and macOS WebKit. This includes native modal audio/close/reopen/focus, sync cache/refresh/failure/recovery, local popover, tablet square tiles,320px layout and automated accessibility. Final modal close-button contrast adjustment is covered by a focused rerun. Static export and Worker bundle passed; final deployment checks to be recorded after release.
