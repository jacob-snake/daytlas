# Daytlas brand configuration

Daytlas is the final name approved on 1 October 2026. Use **Daytlas** in visible copy and **daytlas** in technical identifiers. Canonical destination is **daytlas.com** and the repository is **jacob-snake/daytlas**. External domain cutover is tracked in `docs/continuity/CURRENT.md`; configuration alone does not mean deployed.

`src/lib/brand-config.ts` defines name, slug, domain, repository URL and provisional initial D. It drives the wordmark, metadata, exports, legal references, OAuth copy and generated icons. Keep the established Jakarta typography and design system. The preferred original08Gather logo remains a proposal; this rename does not approve a replacement logo or font.

`PUBLIC_SITE_URL` sets the deployed public origin, with `DAYTLAS_PUBLIC_URL` as optional fallback. Register the exact HTTPS `OURA_REDIRECT_URI` at Oura before switching domains. Accounts and analytics remain disabled.

New browser storage, events, OAuth state and the IndexedDB database use the Daytlas namespace. `src/lib/brand-migration.ts` isolates compatibility reads for previous installations; migrate settings, connections and consent on the same origin without overwriting a new connection. IndexedDB imports are copied transactionally with a migration marker; original records remain until explicit erasure. Reconnecting clears both previous namespaces. These old strings are migration inputs, not active brand identities.

Storage cannot move between domains automatically. Retain access to the previous origin for export/recovery until the migration is complete. Never rewrite historical screenshots, Git history or rollback releases to make them appear newly branded.

Verification and actual deployment status are recorded in CURRENT; migration unit and browser tests use synthetic data only.
