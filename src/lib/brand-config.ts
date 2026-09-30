/** Public presentation only. Never use branding to namespace stored user data. */
const identity = {
  name: "Me by Day",
  slug: "mebyday",
  domain: "mebyday.com",
  // Repository URL is intentionally unchanged until the repository is renamed.
  sourceUrl: "https://github.com/jacob-snake/woura",
} as const;

export const brand = {
  ...identity,
  initial: identity.name.charAt(0),
  publicUrl: `https://${identity.domain}`,
  title: `${identity.name} — your days, in a bigger picture`,
};
