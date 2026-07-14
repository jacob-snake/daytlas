# Woura — SWOT analýza (2026-07-14)

## Strengths
- **Timing:** Oura ruší web dashboard; existujúci užívatelia hľadajú náhradu práve teraz. Retirement je marketing sám o sebe.
- **Privacy-first + open source:** žiadna konkurencia nekombinuje hosted web app + local-first dáta + aktívny vývoj (vital-view je mŕtvy, Cracked-Oura je desktop-only, Grafana stacky vyžadujú DevOps).
- **Jasný feature wedge:** korelácie/overlay metrík (najmilovanejšia funkcia starého webu), čistý export (najhlasnejšia sťažnosť), tagy ako filtre (chýbajú všade), ročné trendy pre všetkých.

## Weaknesses
- Sme závislí na neoficiálnom postavení — žiadna podpora od Oury.
- Local-first = žiadne server-side notifikácie/sync bez fázy 2.
- Jednočlenný projekt: udržateľnosť závisí od komunity.

## Opportunities
- Zachytiť frustrovanú komunitu r/ouraring pri septembrovom vypnutí (launch post).
- Doctor report (PDF), lagged correlations, HRV scatter s baseline pásmami — veci, ktoré nikdy nemal ani oficiálny web.
- Open-core monetizácia neskôr: šifrovaný sync, notifikácie, AI insights.

## Threats (vrátane rizík z Oura dokumentácie)
1. **PAT tokeny boli zrušené (december 2025)** — OAuth2 je jediná cesta. To znamená povinný malý server na výmenu tokenov (client secret).
2. **10-user limit na neschválené OAuth appky** — na verejný launch potrebujeme schválenie appky Ourou. Mitigácia: požiadať o review čo najskôr; do schválenia beta s 10 užívateľmi; self-host návod (každý si zaregistruje vlastnú appku) ako záloha.
3. **CORS: api.ouraring.com nevracia Access-Control-Allow-Origin** pre cudzie origins (empiricky overené) — prehliadač nemôže volať API priamo; potrebný tenký no-log proxy (Cloudflare Worker). Privacy statement upravíme: „dáta prechádzajú cez open-source stateless proxy, ktorý nič neloguje" — čestne zdokumentované v SECURITY.md.
4. Oura môže kedykoľvek zmeniť API podmienky/rate limity, alebo odmietnuť schválenie appky, ktorá konkuruje ich produktu.
5. Niektoré dáta (cycle tracking, detailná teplota) v API v2 nie sú — strop funkcionality.
6. Scores vyžadujú aktívne Oura membership (403 bez neho).

## Kľúčové API fakty
- Base: https://api.ouraring.com, endpointy /v2/usercollection/* (daily_sleep, daily_readiness, daily_activity, sleep, heartrate, daily_spo2, daily_stress, daily_resilience, daily_cardiovascular_age, vO2_max, workout, session, tag/enhanced_tag, sleep_time, rest_mode_period, ring_battery_level, ring_configuration, personal_info).
- Pagination: next_token; 429 s Retry-After; odporúčané webhooks pre inkrementálny sync.
- **Sandbox: /v2/sandbox/usercollection/* — fake dáta BEZ autentifikácie** → celé UI vyvinieme bez reálneho kľúča.
- OAuth2: authorize na cloud.ouraring.com/oauth/authorize, token na api.ouraring.com/oauth/token, scopes: email, personal, daily, heartrate, workout, tag, session, spo2.
