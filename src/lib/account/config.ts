export type AccountConfiguration = {
  url: string;
  key: string;
  origin: string;
  preferences: boolean;
};

export function accountConfiguration(
  env: Record<string, string | undefined> = process.env,
): AccountConfiguration | null {
  if (env.MEBYDAY_ACCOUNTS_ENABLED !== "true") return null;
  try {
    const url = new URL(env.SUPABASE_URL ?? "");
    const site = new URL(env.PUBLIC_SITE_URL ?? "");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(site.hostname);
    if (
      url.protocol !== "https:" ||
      !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      url.port ||
      (site.protocol !== "https:" && !(local && site.protocol === "http:")) ||
      site.pathname !== "/" ||
      site.search ||
      site.hash ||
      site.username ||
      site.password ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(
        env.SUPABASE_PUBLISHABLE_KEY ?? "",
      )
    )
      return null;
    return {
      url: url.origin,
      key: env.SUPABASE_PUBLISHABLE_KEY!,
      origin: site.origin,
      preferences: env.MEBYDAY_ACCOUNT_PREFERENCES_ENABLED === "true",
    };
  } catch {
    return null;
  }
}
