# Woura Security Architecture (Draft)

> **Status:** Draft v0.1 — 2026-07-14
> **Scope:** Woura, an open-source, local-first web dashboard for Oura ring data. Next.js exported as a fully static, client-side app (no app server, no API routes). UI via shadcn/ui. Core promise: **your health data never touches our servers** — traffic flows browser ↔ `api.ouraring.com` only; all data is cached locally in IndexedDB.

---

## 1. Threat Model

### 1.1 System sketch

```
┌──────────────────────────── User's browser ────────────────────────────┐
│  Woura static bundle (HTML/JS/CSS served from static hosting/CDN)      │
│  ├── Oura access token (Personal Access Token or OAuth token)          │
│  ├── IndexedDB cache: sleep, HR/HRV, SpO2, temperature, activity,      │
│  │   workouts, tags — i.e., special-category health data               │
│  └── WebCrypto keys (optional cache encryption)                        │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ HTTPS (only permitted origin)
                ▼
        api.ouraring.com (Oura Cloud API v2)
```

Because there is no backend, **the browser is the entire trusted computing base**. Anything that can execute code in the app's origin, or read the app's origin storage, owns the token and the full health history.

### 1.2 Assets

| Asset | Sensitivity | Where it lives |
|---|---|---|
| Oura access token (PAT / OAuth access+refresh token) | Critical — grants ongoing API access to all historical data | Browser storage |
| Cached health data (sleep, HRV, temperature, cycle-adjacent signals) | Critical — special-category data under GDPR Art. 9 | IndexedDB |
| Derived insights / notes | High | IndexedDB |
| App integrity (the JS we ship) | Critical — compromised JS defeats everything | CDN + supply chain |

### 1.3 Threats, ranked

**T1 — XSS (highest priority).** Any script injection in the app origin can read the token and all cached data and exfiltrate them. In a local-first app there is no server-side session to revoke centrally, and no server-side anomaly detection. XSS is the local-first equivalent of a full database breach. Vectors: rendering API data unsafely (Oura tag notes are user-controlled text!), `dangerouslySetInnerHTML`, third-party components, markdown rendering, URL/`postMessage` handling.

**T2 — Supply chain / npm.** A malicious or compromised dependency (or transitive dependency, or compromised maintainer, or typosquat) ships code in our bundle with full origin privileges. Equivalent in impact to XSS but injected at build time — CSP does *not* stop first-party bundled code from reading storage, only from exfiltrating to non-allowlisted origins (which is exactly why the strict `connect-src` matters).

**T3 — Compromised hosting/CDN or build pipeline.** Whoever can modify the served bundle can ship a silent exfiltrating version. This is the classic "web app zero-knowledge is only as strong as code delivery" problem (the criticism historically leveled at web vaults of Bitwarden/Proton — see §7).

**T4 — Malicious browser extensions.** Extensions with `<all_urls>` host permissions can read the DOM, inject scripts, and read IndexedDB of any origin. **Not defensible by the app**; CSP does not apply to extension content scripts. Mitigation is user education + at-rest encryption raising the bar for passive storage scraping.

**T5 — Shared/lost devices & local attackers.** Anyone with the browser profile (family member, shared/library computer, stolen laptop, forensic access) can open the app and read everything. IndexedDB is plaintext on disk by default.

**T6 — CORS proxy (if ever needed).** Any intermediary sees bearer tokens and response bodies in plaintext (TLS terminates there). A proxy is a trusted party and must be treated as a threat-model concession, not a detail (§4).

**T7 — AI insights egress.** The opt-in AI feature is by definition a data-leaves-device event; risk is *unexpected scope* of the payload, silent retention by the AI provider, and consent fatigue (§5).

**T8 — Traffic analysis / referrer & URL leaks.** Tokens in URLs (OAuth implicit flow fragments, query params) leak via history, logs, referrers. Analytics/telemetry would leak usage metadata — we ship none.

### 1.4 Explicit non-goals

We do not defend against: a fully compromised OS/browser, malware with the user's privileges, Oura's own cloud (data already lives there; Woura reads it), nation-state coercion of the CDN. State these openly in the white paper — honest scoping builds more trust than absolute claims.

---

## 2. Mitigations

### 2.1 Content Security Policy (the backbone)

Because the app is static, CSP must be delivered via hosting headers (Cloudflare Pages `_headers`, Netlify, Vercel `headers` config) — **prefer HTTP headers over `<meta>`** (meta CSP can't use `frame-ancestors` and applies late). Target policy:

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline';        # shadcn/tailwind inline styles; try to drop later
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://api.ouraring.com https://cloud.ouraring.com;
  base-uri 'none';
  object-src 'none';
  form-action 'none';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

Key points:

- **`connect-src` is the single most important line.** Even if malicious code runs (XSS, rogue dependency), it cannot `fetch`/XHR/WebSocket/Beacon data anywhere except Oura and same-origin. This converts "code execution = breach" into "code execution = contained". Close residual exfil channels too: `form-action 'none'` (form-based exfil), no `prefetch`, and be aware DNS-prefetch/`WebRTC` are imperfectly covered — document as residual risk.
- **No `'unsafe-inline'` / `'unsafe-eval'` in `script-src`, ever.** Next.js static export works without eval in production. If an inline bootstrap script is unavoidable, use hashes (`'sha256-…'`) generated at build time, not `'unsafe-inline'`.
- `cloud.ouraring.com` is needed only if using OAuth authorize redirects; navigation isn't governed by `connect-src`, so include it only if actually fetched.
- Add companions: `Cross-Origin-Opener-Policy: same-origin`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`.
- **CI enforcement:** a test that fetches the deployed headers and fails if `connect-src` gained an origin. Treat any CSP diff as a security-review-required change.

### 2.2 No analytics, no telemetry — as an enforced invariant

Zero third-party scripts, zero beacons, zero error reporting (no Sentry), zero web fonts from Google, no update pings. This is both a privacy stance and an XSS-surface reduction. Enforce it structurally: the CSP makes it technically impossible to add analytics without a visible, diffable header change. Say this in marketing exactly as it is: *"There is nothing to opt out of."*

### 2.3 Supply chain hygiene

- **Lockfile discipline:** commit `pnpm-lock.yaml`; CI installs with `--frozen-lockfile`. Pin exact versions (no `^`) for direct deps.
- **Minimum-release-age:** pnpm `minimumReleaseAge` (e.g. 4320 min = 3 days) so freshly-published (possibly hijacked) versions can't enter builds.
- **Audits:** `pnpm audit` + OSV-Scanner in CI; Renovate/Dependabot with grouped, manually-reviewed PRs — *review diffs of dependency updates*, especially postinstall scripts. Disable install scripts by default (`pnpm` does this since v10; keep it).
- **Small dependency surface:** shadcn/ui vendors components into the repo (good — auditable, no runtime package). Prefer copying 50 lines over adding a package. No runtime CDN imports of any kind.
- **Reproducible-ish builds:** document the exact build command; publish build provenance (GitHub Actions + SLSA attestation / `actions/attest-build-provenance`) so anyone can verify the deployed bundle hash matches CI output from the tagged source. This is the honest answer to T3 and the strongest differentiator vs. "trust us" web apps.
- **SRI:** with everything self-hosted and same-origin, SRI adds little (SRI matters for cross-origin scripts, which we don't have). Still emit `integrity` attributes on emitted chunks if the pipeline allows, and note in docs that our real integrity story is provenance + CSP, not SRI.

### 2.4 XSS-specific coding standards

- Ban `dangerouslySetInnerHTML` via ESLint (`react/no-danger`) with per-line justified exceptions; if markdown rendering is ever needed, sanitize with DOMPurify *and* keep CSP as backstop.
- Treat **all Oura API responses as untrusted input** (tag text, workout labels) — render as text nodes only.
- Never place tokens in URLs. OAuth: use **Authorization Code + PKCE** (public client, no secret), not implicit flow.
- Validate/normalize anything read from `location`, `postMessage`, or `storage` events.
- `eslint-plugin-security` + Semgrep rules in CI; `/security-review`-style pass before releases.

### 2.5 Token storage

Options considered:

| Option | Extractable by XSS? | Survives restart | Notes |
|---|---|---|---|
| `localStorage` | Yes, trivially (sync API, classic exfil target) | Yes | Worst option |
| `IndexedDB` (raw string) | Yes | Yes | No better than localStorage cryptographically |
| **Non-extractable `CryptoKey` wrapping (recommended)** | Token ciphertext yes, key **no** | Yes | Generate AES-GCM `CryptoKey` with `extractable: false`, store the *key object* in IndexedDB (structured clone stores the handle, not bytes), store token only as ciphertext. XSS can still *use* the key to decrypt in-page, but cannot exfiltrate the key material, and offline theft of the IndexedDB files yields nothing on most platforms. |
| Session-only (memory + re-auth) | No persistence to steal | No | Offer as a "paranoid mode" toggle |

**Recommendation:** non-extractable CryptoKey wrapping as default; be honest that it is a *hardening*, not a boundary — active XSS in a live session can still call the Oura API with the decrypted token. The real boundary is CSP `connect-src`: even a stolen-in-page token can only be used against `api.ouraring.com` from within the page; exfiltrating the raw token string out requires a channel CSP blocks. Additionally: an explicit **"Disconnect & wipe"** button that deletes token + IndexedDB + CacheStorage, and docs telling users PATs can be revoked at cloud.ouraring.com.

### 2.6 Optional passphrase encryption of the local cache (at rest)

Opt-in "Lock my data" mode for shared computers (T5) and to blunt extension/offline scraping (T4):

- **KDF:** Argon2id preferred (via a small, audited WASM build, e.g. `hash-wasm`; vendor + pin it), parameters ≥ 64 MiB memory, 3 iterations; fallback PBKDF2-SHA-256 ≥ 600,000 iterations (OWASP 2023+ guidance) where WASM is unacceptable. Store salt (16 B random) + KDF params alongside ciphertext for future migration.
- **Scheme:** passphrase → KDF → KEK; KEK wraps a random 256-bit AES-GCM **data key** (so passphrase changes don't re-encrypt the cache). Each record encrypted AES-GCM with a fresh 12-byte random IV, IV stored with ciphertext; include record ID in AAD to prevent ciphertext swapping.
- **UX:** unlock on app open; data key held in memory (optionally as non-extractable CryptoKey) for the session; auto-lock on idle timeout. Honest caveat in UI copy: *"Protects your data at rest on this device. Does not protect against malicious code running while unlocked."*
- Lost passphrase = re-sync from Oura (cache is reconstructible — a genuinely nice property of local-first: no recovery-key ceremony needed).
- This same scheme is the foundation for **Phase 2 zero-knowledge sync**: sync ciphertext blobs only; server stores what it cannot read; key derivation identical, plus a per-account random "account key" pattern à la Bitwarden/1Password if multi-device is added.

---

## 3. If a CORS proxy is unavoidable

First: verify it isn't. Oura API v2 has historically supported CORS for token-authenticated requests from browser apps — **test this first**; if `api.ouraring.com` sends usable `Access-Control-Allow-Origin`, ship with zero proxy and keep this section as contingency.

If some endpoint genuinely requires a proxy (or the OAuth token exchange does, since token endpoints often disallow CORS and PKCE public clients still need the exchange):

### 3.1 Design: a provably-minimal Cloudflare Worker

- **Scope ruthlessly:** proxy *only* the endpoints that need it (ideally only `POST /oauth/token`), hard-allowlist path prefixes and the upstream host `api.ouraring.com`; reject everything else. Never a generic proxy (SSRF/abuse magnet).
- **No logging by construction:** no `console.log` of request/response, Workers Logs/Logpush/Tail disabled in `wrangler.toml` (`[observability] enabled = false`), no analytics engine bindings, no KV/D1/R2 bindings at all (nothing to write to), no `waitUntil` side channels. The Worker is ~50 lines: validate, forward with the client's `Authorization` header, stream the response back, add CORS headers pinned to the app's origin.
- **Strip identifying metadata:** don't forward `CF-Connecting-IP` upstream; drop cookies both ways; set `Referrer-Policy` and pinned `Access-Control-Allow-Origin: https://woura.app` (never `*` on authenticated responses).
- **Open source + verifiability:** the Worker source lives in the main repo; deploy from CI with provenance; publish the `wrangler.toml`. Note honestly that Workers can't (yet) give remote attestation that the deployed code equals the repo — the claim is *"auditable + attested build pipeline"*, not *"cryptographically proven runtime"*.

### 3.2 Honest communication

Never say "we can't see your data" if a proxy exists — say precisely:

> "Requests to Oura pass through a Cloudflare Worker we operate solely to satisfy browser CORS rules for the OAuth token exchange. Its ~50 lines of code are open source, deployed automatically from this repo with build attestation, and configured with all logging disabled. It stores nothing — it has no database, no log sink, and no analytics binding. You must still trust us (and Cloudflare) to run that code; if you don't, use a Personal Access Token instead, which never touches our proxy."

That last escape hatch is important: **offer a PAT mode that is 100% proxy-free** so the maximal-trust path always exists, and make PAT mode the documented default for privacy-focused users.

---

## 4. Opt-in "AI insights" consent flow

Principles: **off by default, explicit per-activation consent, show the exact payload, prefer user-supplied keys.**

Flow design:

1. **Discovery:** feature exists as a card labeled "AI insights (optional — sends data off this device)". Nothing pre-fetched, no SDK loaded until enabled (dynamic import so the AI code isn't even in the initial bundle; keep provider origin *out* of the default CSP and only add it on the deployment/config where the user enabled the feature — if headers are static, use a documented separate `connect-src` entry and call it out in SECURITY.md).
2. **Consent screen (first enable):**
   - Plain-language statement: what leaves the device, to whom (provider name + endpoint URL), why, retention per that provider's policy (link), and that this is revocable.
   - **Payload preview:** render the *literal JSON* that will be sent — actual values, not a schema — in a scrollable code block, with per-field checkboxes (e.g., include sleep stages ✓, exclude tags ✗, date range selector). "What you see is exactly what is sent" and make that true: the preview and the request body are produced by the same function.
   - Data minimization defaults: aggregates/summaries rather than raw time series where the insight allows; no names, no email, a random non-persistent request ID only.
3. **Key options:**
   - **User-supplied API key (recommended default):** stored with the same CryptoKey-wrapping as the Oura token; requests go browser → provider directly; Woura operators are never in the path and have no usage visibility (say so).
   - Optional hosted/shared-key mode only if ever needed — that reintroduces a Woura server and must carry its own consent text; recommend not building it in Phase 1.
4. **Every subsequent use:** a compact confirmation showing payload size + field summary with "view exact payload"; a per-session "don't ask again" (never a permanent silent mode across sessions).
5. **Revocation:** single toggle disables the feature, deletes the stored key, and (where the provider supports it) links to the provider's data-deletion page.
6. **Record:** keep a local-only log of consent events and payloads sent (timestamps + payload hash) — useful for user trust and for GDPR Art. 7(1) demonstrability, stored only on-device.

---

## 5. Public SECURITY.md + privacy white paper — outlines

### 5.1 `SECURITY.md` (repo root)

1. **Security model in one paragraph** — static app, no backend, data flows browser↔Oura only; link to white paper.
2. **Reporting a vulnerability** — private reporting via GitHub Security Advisories; contact email; 90-day coordinated disclosure; no bounty (yet) but public credit.
3. **Scope** — in: XSS, CSP bypass, token handling, crypto design, build pipeline; out: user's compromised device, Oura's own services, social engineering.
4. **Supported versions** — latest deployed version + latest tagged release only.
5. **Hardening summary** — CSP policy (verbatim), storage design, dependency policy, build provenance; "verify it yourself" instructions (curl the headers, check the attestation).
6. **Known limitations** — extensions, in-session XSS residual risk, proxy trust (if any), honest and specific.

### 5.2 Privacy white paper (launch-post companion, ~2–4 pages)

1. **Promise & proof** — "Your data never touches our servers": what that means concretely (list of every network destination the app can contact; there are ~1–2).
2. **Architecture diagram** — the §1.1 picture, reader-friendly.
3. **Threat model summary** — what we defend against, what we can't; explicitly modeled on the candor of Bitwarden's Security Whitepaper and Proton's security model pages.
4. **How to verify, not trust** — open source; CSP headers anyone can inspect in DevTools; build provenance/attestations; instructions for self-hosting ("the ultimate opt-out: run it yourself from source").
5. **Cryptography details** — Argon2id/PBKDF2 params, AES-GCM usage, key wrapping — specific numbers, like Bitwarden's whitepaper does (600k PBKDF2 iterations etc.); vagueness reads as weakness.
6. **The web-delivery caveat, stated by us before critics state it** — a web app's zero-knowledge properties depend on the code served each load; here's what we do about it (provenance, minimal deps, CSP) and the self-host escape hatch. Standard Notes and Bitwarden both gained credibility by acknowledging this class of criticism directly.
7. **AI insights** — exactly what the consent flow shows, restated.
8. **GDPR summary** (below) + contact.

**Communication patterns to borrow:** Bitwarden — public, versioned security whitepaper with concrete algorithms/parameters + third-party audits published in full. Proton — layered comms: one-line promise ("we cannot read your data"), then threat-model page that plainly lists what encryption does *not* protect against. Standard Notes — audits of both clients *and* crypto spec, spec published as its own document (StandardNotes' "specification" repo). Common thread: **specific parameters, named limitations, independent verification paths.** Plan a third-party audit (even a small one, e.g. of the crypto module) before making strong marketing claims; publish results unredacted.

---

## 6. GDPR notes (local-first, health data)

- **Data category:** Oura metrics are health data → **Art. 9 special category**. Processing basis for anything *we* process would need Art. 9(2)(a) explicit consent. But:
- **Controller analysis (the key point):** if Woura is purely client-side and the operators never receive personal data, the *user* processes their own data — the **household exemption (Art. 2(2)(c))** plausibly applies to their use, and Woura's operators are arguably **not a controller at all** for the health data because they never determine means over, nor receive, any personal data. This is the honest legal payoff of the architecture: *the best GDPR posture is not processing the data.* Do not over-claim ("GDPR does not apply to us") — say "we designed Woura so that we do not act as a controller or processor of your health data."
- **What still touches GDPR:**
  - **Hosting logs:** the CDN sees IP addresses (personal data) when serving static assets. Minimal legitimate-interest processing; pick a host, configure log retention short, disclose it. This is the one unavoidable data point — name it.
  - **CORS proxy (if any):** operator becomes at minimum a transient processor of tokens/health data in flight → needs privacy-policy coverage, a lawful basis (consent when enabling), and the no-log design of §3 as data-protection-by-design (Art. 25).
  - **AI insights:** enabling it makes the AI provider a recipient chosen by the user. With user-supplied keys, the user contracts directly with the provider; Woura facilitates. Disclose international transfers implications generically; the consent flow of §5 doubles as Art. 7-quality consent if we ever are deemed a controller for that flow.
- **Rights (Art. 15–20) become trivial and self-serve:** access = the app itself; erasure = "wipe data" button; portability = local export (JSON/CSV) — build the export button and cite it.
- **Docs to write anyway:** a short privacy policy (hosting logs, optional proxy, optional AI), and data-protection-by-design/by-default narrative (Art. 25) — the whole architecture *is* the Art. 25 story; write it up, it's persuasive to both regulators and users.
- Users in the EU also have rights against **Oura** (the actual controller of the source data); link to Oura's own privacy channels rather than implying Woura controls that.

---

## 7. Implementation checklist (Phase 1)

- [ ] Static export config; verify zero server code paths
- [ ] `_headers` with the §2.1 CSP + companion headers; CI test asserting exact `connect-src`
- [ ] PAT-first auth flow; OAuth PKCE only if CORS-clean without proxy
- [ ] Token stored via non-extractable AES-GCM CryptoKey wrapping; "Disconnect & wipe" button
- [ ] ESLint: `react/no-danger`, security plugin; Semgrep in CI
- [ ] pnpm frozen lockfile, `minimumReleaseAge`, scripts disabled, OSV-Scanner in CI
- [ ] Build provenance attestation in release workflow
- [ ] Optional passphrase lock (Argon2id + AES-GCM key-wrap) behind a settings toggle
- [ ] Local export (JSON) + full wipe (GDPR self-serve rights)
- [ ] `SECURITY.md` per §5.1; white paper draft per §5.2 before launch post
- [ ] If proxy needed: minimal Worker per §3, observability disabled, source in repo
- [ ] AI insights: dynamic import, consent screen with literal payload preview, user-key mode

---

*Open questions for review: (a) confirm current CORS behavior of Oura API v2 endpoints and token endpoint; (b) decide Argon2 WASM vendor; (c) whether to add a "paranoid" memory-only session mode at launch; (d) audit budget/timing before strong public claims.*
