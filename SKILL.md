# SKILL.md — Woura

Znalostná báza projektu. Priebežne aktualizovať pri každom zásadnom rozhodnutí alebo zistení.

## Čo je Woura
Open-source, local-first web dashboard pre dáta z Oura prstena. Náhrada za „Oura on the Web" (cloud.ouraring.com), ktorý Oura ruší v septembri 2026. Fáza 1: osobné použitie pre Jakuba, lokálne. Fáza 2 (možno): verejný open-source release.

## Kľúčové rozhodnutia
- **Architektúra: local-first.** Zdravotné dáta idú prehliadač ↔ Oura API, ukladajú sa len lokálne (localStorage/IndexedDB). Žiadna serverová DB, žiadne účty, žiadna telemetria.
- **CORS:** api.ouraring.com neposiela `Access-Control-Allow-Origin` pre cudzie origins (empiricky overené) → v appke je stateless pass-through proxy `/api/oura/[...path]` (nič neloguje, allowlist len `v2/usercollection/` a `v2/sandbox/usercollection/`).
- **Auth: iba OAuth2.** Personal Access Tokens Oura zrušila v decembri 2025. Authorization-code flow: authorize `https://cloud.ouraring.com/oauth/authorize`, token `https://api.ouraring.com/oauth/token`. Client ID/Secret v `.env.local` (`OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`). Redirect URI: `http://localhost:3001/api/auth/callback`. Tokeny žijú len v localStorage prehliadača (`woura.token`, `woura.refresh`, `woura.expiresAt`, `woura.mode`).
- **Sandbox:** `/v2/sandbox/usercollection/*` vracia fake dáta — vyžaduje ľubovoľný neprázdny `Authorization` header. Celé UI sa vyvíja na sandboxe (mode `sandbox`).
- **Monetizácia:** free + donations. §4(a)(xiii) API Agreementu ZAKAZUJE spoplatniť užívateľom funkcionalitu nad API.
- **AI insights: VYRADENÉ.** API Agreement (§4(d), §6(g)) zakazuje posielať User Data z API akémukoľvek AI modelu — aj so súhlasom užívateľa. LLM prístup Oura povoľuje len cez ich MCP Server. Nikdy nepridávať LLM funkciu nad API dátami.
- **Grafy: shadcn `chart` (Recharts).** Žiadna ťažšia knižnica. Nikdy dual-axis — rôzne jednotky = samostatné panely.
- **Dark mode first**, `className="dark"` na `<html>`.

## API Agreement — právne mantinely (effective 2026-06-08)
- Zákaz produktu, ktorý „competes with or merely replicates" Oura → pre osobné použitie OK; pri verejnom releasi opatrnosť.
- §6(e): názov appky nesmie byť „confusingly similar" k Oura → „Woura" je pri verejnom releasi rizikový, zvážiť premenovanie.
- §4(f): žiadne press releases/oznámenia odkazujúce na Oura bez súhlasu; žiadne naznačovanie endorsementu; žiadny disparagement.
- §5(i): ToS appky musí disclaimovať warranties tretích strán → je v `/terms`.
- Aggregator status (posielanie dát tretím stranám) = tvrdé povinnosti → nikdy sa ním nestať; open-source self-host model to obchádza (každý user = vlastná registrácia).
- 10-user limit na neschválenú OAuth appku — pre osobné použitie irelevantné.
- Scores vyžadujú aktívne Oura membership (inak 403).

## Oura API v2 fakty
- Base `https://api.ouraring.com`, endpointy `GET /v2/usercollection/{type}`: daily_sleep, daily_readiness, daily_activity, daily_stress, daily_spo2, daily_resilience, daily_cardiovascular_age, sleep, heartrate, workout, session, tag/enhanced_tag, sleep_time, rest_mode_period, ring_battery_level, ring_configuration, personal_info, vO2_max (pozor na veľké O).
- Daily endpointy: `start_date`/`end_date`; time-series (heartrate, ring_battery_level): `start_datetime`/`end_datetime`.
- Pagination: `next_token` v odpovedi, posielať späť ako query param, kým nie je null.
- Rate limit: 429 + `Retry-After` header (klient automaticky čaká a opakuje).
- Webhooky odporúčané pre inkrementálny sync (history raz, potom push ~30 s po sync mobilnej appky). Webhook endpointy používajú `x-client-id`/`x-client-secret` headery.
- OpenAPI spec: `https://cloud.ouraring.com/v2/static/json/openapi-1.35.json` (lokálne kópia v ~/Downloads).

## Štruktúra kódu
- `src/app/api/oura/[...path]/route.ts` — no-log proxy
- `src/app/api/auth/{login,callback,refresh}/route.ts` — OAuth flow
- `src/lib/oura/{types,client,queries}.ts` — typy, fetch s pagináciou/retry, merge per-day
- `src/components/dashboard/` — score-card, trend-chart, connect-dialog
- `src/app/{privacy,terms}/page.tsx` — vyžadované pri registrácii OAuth appky
- `docs/` — SWOT.md, SECURITY_ARCHITECTURE.md, design/*.html (5 mockupov z design roundtable)

## Design (aktuálny stav — Jakubove rozhodnutie 2026-07-14)
- **LIGHT MODE FIRST** — editorial štýl podľa referencií: teplé papierové pozadie (`oklch(0.97 0.007 95)`), ink-black typografia, veľké bold čísla, výrazné živé farby. Dark mode ostáva ako sekundárny (bez `dark` class na html).
- Validovaná živá light paleta (six-checks PASS, CVD WARN band → legendy povinné): sleep `#2a63c9` modrá, readiness `#5a6b1f` olivová, activity `#e8622c` oranžová, HRV `#7a4fb8` fialová, temperature `#0e8a6b` teal. Poradie slotov = CVD mechanizmus, nemeniť.
- Dark paleta (sekundárna): `#3987e5/#199e70/#c98500/#9085e9/#e66767`.
- make-interfaces-feel-better skill aplikovaný: shadow-as-border na kartách, stagger enter animácie, scale 0.96 on press, text-balance/pretty, antialiased.
- Radius 0.875rem, koncentrické radiusy.
- Privacy ako tichý status chip, nie banner; veľké skóre hore, trendy pod tým.

## UX rozhodnutia
- **Žiadny sandbox/sign-in UI** — úvod = Welcome screen s „Authorize with Oura" + Buy Me a Coffee (buymeacoffee.com/jakubhad — over handle!). Sandbox ostáva len interne (fallback keď nie je token).
- **Trends stránka (/trends)**: from–do date range, Period (daily/weekly/monthly agregácia), timeline s Brush (drag-zoom, grafy pod tým sa prispôsobia), „Add Chart" so všetkými ~32 metrikami v skupinách (Scores/Sleep/Heart & Body/Activity), tags summary chips, korelačná matica všetkých pridaných metrík navzájom (Pearson r z aktuálneho výberu).
- Metrický register v `src/lib/oura/metrics.ts` pokrýva celý zoznam z Oura on the Web (Activity Burn, Average MET, SpO2, Respiratory Rate, Bedtime/Midpoint/Wake-up ako decimal hours, Walking Equivalency km, …). V API chýbajú len cycle insights.

## Dataviz pravidlá (skill dataviz)
- Pred každým novým grafom: paletu validovať `validate_palette.js`
- Jeden y-axis; legenda pri ≥2 sériách; text nikdy vo farbe série; tooltip/hover vždy
- Export v ľudských jednotkách (hodiny, nie sekundy — top sťažnosť užívateľov na Oura export)

## Research insights (čo užívatelia chcú)
1. Korelácie 2 metrík + Pearson r (najmilovanejšia funkcia starého webu)
2. Čistý export (CSV/JSON, jeden súbor, ľudské jednotky) + filtrovanie dátumov/metrík
3. Tagy ako filtre (nemá nikto)
4. Ročné+ trendy pre všetkých
5. HRV scatter s trendovou čiarou a baseline pásmami
6. PDF „report pre doktora"
Konkurencia: Cracked-Oura (346★, desktop-only), vital-view (mŕtvy), Grafana stacky (DevOps bariéra). Nikto nekombinuje web + local-first + údržbu.

## Prevádzka
- Dev: `npm run dev`; prod test: `npm run build && npm run start -- -p 3001`
- Užívateľ (Jakub) nie je technický — komunikovať jednoducho, po slovensky, bez žargónu; kroky za neho alebo presné copy-paste hodnoty.
- Reálne zdravotné dáta Jakuba neposielať do chatu/LLM.
