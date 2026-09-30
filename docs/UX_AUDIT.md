# UX Audit — Daytlas (ux-audit-rethink / IxDF metodológia, 2026-07-15)

## Kontext & persóny
- **P1 „Jakub"** — vlastník, netechnický QS nadšenec; chce odpovede v reči, nie štatistický žargón.
- **P2 „Power QS user"** — r/ouraring publikum; chce hĺbku, export, korelácie, klávesnicu.
- **P3 „Privacy-refugee"** — prišiel po zrušení Oura webu; rozhoduje sa podľa dôvery za prvých 30 sekúnd.

## Framework 1 — 7 faktorov UX

| Faktor | Skóre | Kľúčové zistenia |
|---|---|---|
| Useful | 5/5 | Rieši reálny problém (rušený web), pridáva unikáty (Tag Lab, baseline, barcode). |
| Usable | 3.5/5 | ⚠️ Dashboard je po pridaní insights DLHÝ bez sekčnej štruktúry; rozsahové taby (30d/90d/1y) ovplyvňujú len trend graf, nie insight karty — mätúci scope; žiadny viditeľný „settings/disconnect". |
| Findable | 3/5 | ⚠️ 4 stránky bez úvodného prehľadu; ⌘K paleta je neobjaviteľná (nič na ňu neupozorňuje); „Wipe cached data" žije LEN v palete — privacy akcia nesmie byť skrytá. |
| Credible | 4.5/5 | Privacy chip, /privacy, /terms, open source. Chýba footer s odkazmi + verziou (dôvera = transparentné pätičky). |
| Desirable | 4/5 | Polish dobrý; Ring/Barcode sú „wow". Score karty vs insight karty si vizuálne konkurujú (dve hierarchie „hlavných čísel"). |
| Accessible | 3/5 | ⚠️ Vlastné SVG vizuály (heatmap, barcode, ring, slope) sú hover-only — bez klávesnice a čítačky; jemné hairlines na hrane kontrastu; inak Radix základ solídny. |
| Valuable | 4.5/5 | Free + BMC v súlade s hodnotami; hodnota rastie s históriou užívateľa. |

## Framework 2 — 5 usability charakteristík

- **Effectiveness 4/5** — ciele splniteľné; Tag Lab má správne guardy (min n).
- **Efficiency 3.5/5** — ⚠️ prvé načítanie celej histórie môže trvať dlho a UI mlčí (len skeleton) — treba povedať „prvýkrát sťahujem celú históriu, nabudúce to bude okamžité".
- **Engagement 4/5** — milestones/streaky fungujú; animácie umiernené.
- **Error tolerance 3.5/5** — Alert je dobrý, ale expirácia tokenu ukáže surové „Oura API 401" namiesto „prihlás sa znova" akcie.
- **Ease of learning 3/5** — ⚠️ žargón: „Pearson r", „±1σ", „percentile", „IQR" bez vysvetlenia — P1 persóna mu nerozumie. Každé odborné číslo potrebuje jednovetové ľudské vysvetlenie.

## Framework 3 — 5 dimenzií interakcie

1. **Words 3.5/5** — microcopy miestami výborná („be kind to yourself"), ale štatistické skratky neprekladáme.
2. **Visual 4.5/5** — konzistentný systém, validované palety.
3. **Physical 3.5/5** — desktop-first OK (cieľ produktu), ale heatmap bunky 14 px sú pod dotykovým minimom — na tablete nepoužiteľné.
4. **Time 4/5** — skeletony sedia rozmermi (CLS ok); chýba komunikácia dlhého prvého fetchu.
5. **Behavior 4/5** — konzistentné; brush → grafy je skvelý vzor; Remove graf nemá undo (nízka závažnosť — re-add je ľahký).

## Prioritizovaný backlog

**P1 (quick wins — implementované v tomto commite):**
1. Footer na všetkých stránkach: Privacy · Terms · GitHub · verzia · „Wipe local data" tlačidlo (rieši Findable + Credible).
2. „⌘K" hint v hlavičke (rieši objaviteľnosť palety).
3. Hláška pri prvom fetchi histórie („This first load fetches your entire history — it's cached after").
4. Ľudské vysvetlenia žargónu: r, σ pásmo, percentil — krátka veta pod grafmi.
5. Sekčné nadpisy na Dashboarde: Today / How you compare / Your patterns.
6. 401 error → tlačidlo „Sign in again" priamo v Alerte.

**P2 (ďalšie kolo):**
7. Klávesnica + fokus pre SVG vizuály (tabIndex na bunky, aria-label, šípky) — Accessible je najslabší pilier.
8. Scope rozsahových tabov: presunúť trend graf + taby do jednej karty, nech je jasné, čo ovládajú.
9. Onboarding: po prvom prihlásení 3-krokový intro tooltip (Dashboard → Trends → Tag Lab).
10. Vizuálna hierarchia: score karty zmenšiť, insight karty sú dôležitejšie.

**P3 (strategické):**
11. ✅ Mobile/tablet layout pass (2026-07-21): AppHeader nav je pod `sm:` icon-only
    (nie 4 rozpité textové tlačidlá), Trends sticky control bar sa na mobile
    rozpadá na dva horizontálne scrollovateľné riadky namiesto orezania,
    DateRangePicker prepína na 1-mesačný kalendár pod `sm:` a celý popover má
    `max-w-[calc(100vw-2rem)]` + vlastný scroll namiesto pretečenia mimo
    viewport. Heatmapa/ring/barcode zostávajú husté vizuály s horizontálnym
    scrollom na úzkych šírkach (rovnaký kompromis ako GitHub/Oura) —
    zjednodušený „mesačný detail" view sa neimplementoval, zvážiť neskôr ak
    z analytiky vyjde reálna mobilná návštevnosť.
12. ✅ Self-host onboarding guide — hotové v README.md.
13. Undo toast pattern pre deštruktívne akcie — zatiaľ žiadna nová deštruktívna
    akcia nepribudla (Wipe local data má vlastný potvrdzujúci tok), odložené.
