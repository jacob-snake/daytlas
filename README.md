# Daytlas

**Your Oura data, on your terms.** An open-source, local-first web dashboard for
Oura ring data — built when Oura retired "Oura on the Web".

- 🔒 **Local-first**: your health data goes browser ↔ Oura API and is cached
  only on your device (IndexedDB). No accounts, no database, no telemetry.
- 🚫 **No AI**: every insight is plain, inspectable statistics
  (`src/lib/analytics.ts`) computed in your browser. Nothing ever leaves it.
- 📊 **More than the old Oura web**: full-history trends, correlation matrix,
  ±1σ baseline bands, calendar heatmap, ring year, sleep-rhythm barcode,
  weekday profiles, baseline-shift detection, streaks — and **Tag Lab**, which
  shows what your tagged habits do to your body the next day.
- 📤 **Clean export**: CSV/JSON, human units (hours, not seconds), date and
  metric filters.

Free forever. If it's useful, [buy me a coffee](https://buymeacoffee.com/hadjakub). ☕

## Self-hosting (10 minutes)

Personal access tokens were retired by Oura in Dec 2025, so you register your
own (free) OAuth app — your data then flows only between your browser, your
own app registration, and Oura:

1. **Register an Oura app** at
   [cloud.ouraring.com/oauth/applications](https://cloud.ouraring.com/oauth/applications):
   - Website: `http://localhost:3001`
   - Privacy Policy: `http://localhost:3001/privacy`
   - Terms of Service: `http://localhost:3001/terms`
   - Redirect URI: `http://localhost:3001/api/auth/callback` (exactly)
   - Tick all scopes, agree, create — copy the Client ID and Client Secret.
2. **Clone & configure**:
   ```bash
   git clone https://github.com/jacob-snake/daytlas && cd daytlas
   npm install
   cp .env.example .env.local   # then paste your Client ID/Secret into it
   ```
3. **Run**:
   ```bash
   npm run build && npm run start -- -p 3001
   ```
   Open http://localhost:3001 and click **Authorize with Oura**.

The unapproved-app limit of 10 users is irrelevant here — your registration
serves only you.

## Versioning & upgrades

Daytlas uses [SemVer](https://semver.org/) (`MAJOR.MINOR.PATCH`). The running
version is shown in the footer and links to the
[releases page](https://github.com/jacob-snake/daytlas/releases) — Daytlas never
checks for updates automatically (no phoning home, by design).

To upgrade a self-hosted install:

```bash
git pull
npm install
npm run build && npm run start -- -p 3001
```

Your data and login are untouched — they live in your browser, not in the app
folder. See [CHANGELOG.md](CHANGELOG.md) for what changed.

## Privacy & security

The full threat model and architecture live in
[docs/SECURITY_ARCHITECTURE.md](docs/SECURITY_ARCHITECTURE.md). Short version:

- The bundled API proxy exists only because api.ouraring.com doesn't send CORS
  headers; it forwards requests verbatim and stores/logs nothing (~40 lines,
  read it yourself: `src/app/api/oura/[...path]/route.ts`).
- Tokens are stored in your browser only and sent only to `api.ouraring.com`.
- "Wipe local data" in the footer deletes everything cached on your device;
  revoke API access anytime at cloud.ouraring.com.

## Disclaimer

Daytlas is an independent open-source project, not affiliated with or endorsed
by Ōura Health Oy / Ouraring Inc. It is not a medical device. Your use of the
Oura API is subject to the Oura API and MCP Agreement.

## License

MIT
