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
  assets: {
    favicon: "/brand/v1.2/favicon.ico",
    logo: "/brand/v1.2/logo.svg",
    symbol: "/brand/v1.2/symbol.svg",
    socialLogo: "/brand/v1.2/logo.png",
    wordmark: "/brand/v1.2/wordmark.svg",
    icon: (size: number) => `/brand/v1.2/icon-${size}.png`,
  },
  publicUrl: `https://${identity.domain}`,
  title: `${identity.name} — your days, in a bigger picture`,
};
