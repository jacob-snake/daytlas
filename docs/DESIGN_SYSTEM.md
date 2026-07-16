# Woura Design System

Single source of truth for visual decisions. All UI chrome uses semantic tokens
from `src/app/globals.css`; components never hardcode chrome colors.

## Tokens

### Color — UI chrome (light, primary theme)
| Token | Value | Use |
|---|---|---|
| `--background` | `oklch(0.97 0.007 95)` | warm paper page |
| `--card` | `oklch(0.995 0.002 95)` | surfaces |
| `--foreground` | `oklch(0.17 0.005 90)` | ink text |
| `--muted-foreground` | `oklch(0.5 0.015 90)` | secondary text (≥4.5:1) |
| `--border` / `--input` | `oklch(0.9 0.01 95)` | dividers, form outlines only |

Dark theme exists as secondary (`.dark`), same token names.

### Color — data (validated, dataviz six-checks)
One hue = one metric, everywhere. Slot order is the colorblind-safety
mechanism — never reorder.

| Slot | Metric | Light | Dark |
|---|---|---|---|
| `--chart-1` | Sleep | `#2e6be6` | `#3987e5` |
| `--chart-2` | Readiness | `#456f10` | `#199e70` |
| `--chart-3` | Activity | `#e26e0a` | `#c98500` |
| `--chart-4` | HRV | `#8a4de0` | `#9085e9` |
| `--chart-5` | Temperature | `#00996e` | `#e66767` |

CVD separation sits in the 8–12 floor band → legends/direct labels are
mandatory on every multi-series chart.

**Sequential ramp** (heatmap, sleep barcode — magnitude encoding):
`#e7efff → #bcd3fb → #84adf5 → #4a80ec → #2058d4 → #0d3695 → #071d55` (7 steps, single hue, monotonic lightness, high span for visible contrast). **Diverging** (correlation r): blue `rgba(57,135,229,α)`
positive ↔ red `rgba(230,103,103,α)` negative, neutral at zero. These literals
live only inside viz components; they encode data, not chrome.

### Typography
- Sans: **Plus Jakarta Sans** (next/font, self-hosted; no external requests)
- Mono: Geist Mono — numerals, r-values, axis ticks; `tabular-nums` on all data
- No serifs anywhere. Headings `text-balance`, body `text-pretty`

### Radius & spacing
- `--radius: 0.875rem`; concentric nesting: outer = inner + padding
- Spacing on the Tailwind 4/8 scale; page gutter `p-6 md:p-10`

### Elevation
- Cards: `--shadow-border` (hairline ring + diffused ambient lift), hover
  `--shadow-border-hover` + `-1px` translate. No solid borders for depth;
  borders are for dividers/inputs only.

### Motion
- Easing: `--ease-premium: cubic-bezier(0.32, 0.72, 0, 1)`; micro 150–300 ms
- Motion (motion/react) with `MotionConfig reducedMotion="user"`
- Enter: y+blur spring (bounce 0); exits softer than enters (−12 px, 150 ms)
- Press: `scale(0.96)`; only `transform`/`opacity`/`filter` are animated

### Texture
- Global film-grain overlay (inline SVG turbulence, opacity 0.025)

## Components
All UI from shadcn/ui: Card, Button, Badge, Tabs, Select, Input, Label,
Switch, Dialog, Alert, Table, Skeleton, Separator, Tooltip, Sonner, Command,
Calendar, Popover, Empty, Spinner, Chart (Recharts). Icons: Phosphor **filled** (`weight="fill"`) for decorative/semantic icons; Lucide outline only for functional glyphs (close, arrows). No emoji as icons.

## Patterns (beyond base shadcn)
- **Insight card**: CardDescription (metric dot + window) → big tabular
  CardTitle + delta Badge → 1–3 plain-language sentences (percentile story,
  vs-last-year, best day). Always number + words, never number alone.
- **Distribution card**: stacked histogram (all days muted, recent window in
  `--chart-3`) + dashed ReferenceLine at the recent mean. Title is a question.
- **RingYear**: radial spokes, sequential ramp, hover elongates spoke; center
  is a live readout (label / big value / context line).
- **YearHeatmap / SleepBarcode**: sequential ramp only; hover readout line
  above the SVG doubles as the accessible text alternative.

## Audit status (2026-07-15)
- Hardcoded colors outside globals: only the three viz-encoding files listed
  above — intentional, documented here.
- Icon-only buttons carry `aria-label`; focus rings intact; cursor-pointer
  restored globally for enabled controls.
