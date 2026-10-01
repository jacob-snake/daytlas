# Daytlas domain cutover

1 October 2026. Canonical public address: https://daytlas.com.

The existing Oura application was renamed to Daytlas. Its website, privacy and terms links now use the new address. The new callback is registered alongside the previous callback. Credentials and scopes were not changed.

Browser history, tokens and preferences are origin-scoped. The previous address therefore remains available during migration. A shared notice links to the new address and the existing profile export. Users reconnect Oura or import their file on the new address; no automatic cross-domain transfer occurs.

The native Worker has an explicit, temporary `DAYTLAS_PREVIOUS_ORIGIN_ENABLED=true` setting. Only the exact previous HTTPS origin receives its own callback configuration. Each origin retains host-only state cookies, callback state validation and strict same-origin API checks. The setting cannot repair invalid credentials or an invalid canonical configuration. Other hosts continue to redirect login to the canonical domain and cannot relay API requests.

Production settings:

- Worker: `daytlas`
- `PUBLIC_SITE_URL=https://daytlas.com`
- `OURA_REDIRECT_URI=https://daytlas.com/api/auth/callback`
- `DAYTLAS_PREVIOUS_ORIGIN_ENABLED=true` during recovery
- Accounts and analytics remain off.
- Preserve the existing Oura secrets and all mail DNS records.

Remove previous-origin support only after a separate decision about the recovery window. Do not redirect existing app users away from their browser-local history without recovery access.

Verification covers login/callback isolation, blocked cross-origin requests, invalid configuration, the production asset bundle and both browser engines. Deployment evidence lives in the retained release and continuity handoff.
