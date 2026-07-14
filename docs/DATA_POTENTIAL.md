# Analýza potenciálu Oura dát (podľa data-visualization skill guide)

Inventár toho, čo dáta unesú, a správna forma grafu pre každý vzťah
(chart-selection tabuľka zo skillu). ✅ = máme, 🔜 = roadmap.

## Čo dáta obsahujú
~32 denných metrík (skóre, spánkové fázy, HRV, tep, teplota, SpO2, dych,
aktivita), časové rady za roky, tagy (udalosti), workouts/sessions,
5-min granularita tepu a fáz vnútri noci.

## Mapovanie vzťah → forma

| Vzťah v dátach | Správna forma (skill) | Stav |
|---|---|---|
| Trend metriky v čase | line chart | ✅ Trends panely |
| Ako sa mám teraz vs. moja história | distribution (histogram) + percentil | ✅ DistributionCard + InsightCards |
| Korelácia 2 metrík | scatter | ✅ CorrelationCard |
| Korelácia mnohých metrík | heatmap (correlation matrix) | ✅ CorrelationMatrixCard |
| Celoročný denný vzor | calendar heatmap / radial | ✅ YearHeatmap, RingYear |
| Rytmus (čas ako hodnota) | barcode/strip plot | ✅ SleepBarcode |
| **Porovnanie 2 období naprieč metrikami** | **slope chart** (skill: „ranking/comparing two periods") | 🔜 top kandidát — „tento mesiac vs minulý" jedným pohľadom |
| **Rozdelenie podľa dňa v týždni** | **box plot** (skill: „distribution across groups") | 🔜 „piatky spím o 40 min menej" |
| **Kompozícia spánku v čase** | **stacked area** (fázy deep/REM/light) | 🔜 |
| **Výkon vs. cieľ** | **bullet chart** (nie gauge) | 🔜 osobné ciele (kroky, spánok ≥ 7 h) |
| **Vplyv tagov na metriky** | strip/dot plot: dni s tagom vs bez | 🔜 najsilnejší unikát — nikto nemá |
| **Oneskorené vzťahy** | lagged scatter (alkohol dnes → HRV zajtra) | 🔜 |
| Viac KPI naraz | small multiples | ✅ VitalsPanels |

## Anti-patterny, ktoré dodržiavame (skill)
- žiadne pie/donut/3D/dual-axis grafy
- porovnania = bar/slope, nie uhly
- farba nikdy nie je jediný nosič významu (legendy + hodnoty)

## Priorita ďalšej práce
1. **Slope chart „This month vs last"** — priamo odpovedá na „ako sa mi darí"
2. **Tag impact** (dni s tagom vs bez, delta + počet dní) — killer feature
3. Weekday box plots
4. Sleep composition stacked area
5. Bullet charts s osobnými cieľmi + notifikácie (fáza 2)
