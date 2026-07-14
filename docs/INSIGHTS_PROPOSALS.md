# Insights & vizualizačné návrhy (data-analysis skill, 2026-07-15)

Metodologická analýza potenciálu Oura dát. Všetky výpočty bežia lokálne
v prehliadači (Oura API Agreement zakazuje posielať User Data do AI —
naša výhoda: „insights bez AI, matematikou, ktorú vidíš v kóde").

## A. Štatistické vrstvy, ktoré dáta unesú

1. **Baseline & odchýlky (z-skóre).** Pre každú metriku kĺzavý 60-dňový
   priemer + smerodajná odchýlka → dnešok ako z-skóre. Interpretácia v reči:
   „HRV je 1,8σ pod tvojím normálom — najnižšie za 3 mesiace."
   *Vizuál: line chart s baseline pásmom (±1σ tieň), body mimo pásma zvýraznené.*
2. **Weekday efekt.** Priemer + rozptyl metriky podľa dňa v týždni.
   „V piatky spíš o 42 min menej a HRV máš o 6 ms nižšie."
   *Vizuál: box plot / dot plot po dňoch týždňa.*
3. **Sezónnosť.** Mesačné priemery naprieč rokmi (zima vs leto HRV, teplota).
   *Vizuál: cycle plot alebo 12-mesačný radar? Nie — radar skresľuje; použiť
   heatmapu mesiac × rok.*
4. **Changepoint detekcia.** Jednoduchý CUSUM/rolling-delta odhalí zlomy
   („od 12. marca sa ti trvalo zdvihol pokojový tep — nová práca? liek?").
   *Vizuál: trend s vyznačenými zlomami + anotácie (užívateľ si zlom pomenuje).*
5. **Tag impact (kauzálne náznaky).** Pár dní s tagom vs. matched dni bez:
   delta + interval spoľahlivosti. „Alkohol: −12 HRV, −8 readiness na druhý
   deň (n=14)." *Vizuál: dumbbell/slope chart per tag, zoradené podľa dopadu.*
6. **Lagged korelácie.** Metrika A dnes → metrika B o 1–3 dni. Aktivita dnes
   → spánok zajtra. *Vizuál: lag scatter + malá lag-korelačná tabuľka.*
7. **Streaky & rekordy.** Najdlhšia séria skóre ≥ 85, osobné rekordy,
   „300. sledovaná noc". *Vizuál: timeline s míľnikmi; gamifikácia bez cloudu.*
8. **Spánková architektúra.** Pomer fáz (deep/REM/light) v čase + vs. vek-norma.
   *Vizuál: 100% stacked area (kompozícia v čase).*
9. **Weekly report.** Nedeľný sumár: 3 najväčšie odchýlky týždňa v reči +
   mini-grafy. *Vizuál: karta „Your week" — základ pre budúce notifikácie.*
10. **Readiness drivers.** Ktorý contributor (HRV balance, sleep balance…)
    najčastejšie ťahá skóre dole. *Vizuál: horizontálny bar „čo ťa brzdí".*

## B. Konkrétne nové obrazovky (priorita)

1. **„This month vs…" slope chart** — všetky metriky, 2 stĺpce (minulý mesiac
   → tento), čiara hore/dole s farbou. Jeden pohľad = celý stav. [ĽAHKÉ]
2. **Tag Lab** — vyber tag, appka ukáže dopad na všetky metriky (bod 5).
   Killer feature, nikto to nemá. [STREDNÉ]
3. **Baseline pásma do Trends panelov** (bod 1). [ĽAHKÉ]
4. **Weekday profil** (bod 2). [ĽAHKÉ]
5. **Milestones/rekordy na Dashboard** (bod 7). [ĽAHKÉ]
6. **Weekly report karta** (bod 9) → neskôr push/email vo fáze 2. [STREDNÉ]

## C. Interpretačné zásady
- Vždy číslo + veta v reči + kontext (percentil/σ), nikdy len číslo.
- Korelácia ≠ kauzalita — pri tag impacte ukazovať n a rozptyl.
- Malé n (< 5 dní s tagom) = nezobrazovať záver, len „zbieram dáta".
- Zdravotné disclaimery: sme nástroj na sebapoznanie, nie diagnostika.
