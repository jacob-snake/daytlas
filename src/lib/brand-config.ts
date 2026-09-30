/** Public presentation only. Never use branding to namespace stored user data. */
const identity = {
  name: "Daytlas",
  slug: "daytlas",
  domain: "daytlas.com",
  // Canonical repository, renamed with the Daytlas rollout.
  sourceUrl: "https://github.com/jacob-snake/daytlas",
} as const;

export const brand = {
  ...identity,
  initial: identity.name.charAt(0),
  publicUrl: `https://${identity.domain}`,
  title: `${identity.name} — your days, in a bigger picture`,
};
