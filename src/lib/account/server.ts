import {
  createServerClient,
  parseCookieHeader,
  serializeCookieHeader,
  type CookieOptions,
} from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { AccountConfiguration } from "./config";
import { AccountError, type AccountProvider } from "./handler";

const cookieName = "mbd-account";
export function createAccountProvider(
  request: Request,
  config: AccountConfiguration,
  fetcher: typeof fetch = fetch,
): AccountProvider {
  const changes = new Map<string, { value: string; options: CookieOptions }>();
  const cookieOptions: CookieOptions = {
    path: "/",
    httpOnly: true,
    secure: config.origin.startsWith("https:"),
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
  };
  const client = createServerClient(config.url, config.key, {
    cookieOptions: { ...cookieOptions, name: cookieName },
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get("cookie") ?? ""),
      setAll: (cookies) => {
        for (const { name, value, options } of cookies) {
          changes.set(name, {
            value,
            options: {
              ...options,
              ...cookieOptions,
              ...(options.maxAge === 0 ? { maxAge: 0 } : {}),
            },
          });
        }
      },
    },
    global: {
      fetch: (url, init) =>
        fetcher(url, {
          ...init,
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(15_000),
        }),
    },
  });
  const safeUser = (user: User | null) =>
    user?.email
      ? {
          id: user.id,
          email: user.email,
          verified: Boolean(user.email_confirmed_at) && !user.is_anonymous,
        }
      : null;
  const failure = (
    error: { status?: number; code?: string } | null,
    fallback: "invalid_code" | "unavailable" = "unavailable",
  ) => {
    if (error)
      throw new AccountError(error.status === 429 ? "rate_limited" : fallback);
  };
  return {
    async user() {
      const { data, error } = await client.auth.getUser();
      if (
        error?.status === 400 ||
        error?.status === 401 ||
        error?.status === 403 ||
        error?.name === "AuthSessionMissingError"
      )
        return null;
      failure(error);
      return safeUser(data.user);
    },
    async requestCode(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      failure(error);
    },
    async verifyCode(email, token) {
      const { error } = await client.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      failure(error, "invalid_code");
      const { data, error: userError } = await client.auth.getUser();
      failure(userError, "invalid_code");
      return safeUser(data.user);
    },
    async signOut() {
      // Always erase this browser's account cookies even if remote revocation fails.
      try {
        await client.auth.signOut({ scope: "local" });
      } finally {
        for (const { name } of parseCookieHeader(
          request.headers.get("cookie") ?? "",
        )) {
          if (
            name === cookieName ||
            name.startsWith(`${cookieName}.`) ||
            name === `${cookieName}-code-verifier`
          ) {
            changes.set(name, {
              value: "",
              options: { ...cookieOptions, maxAge: 0 },
            });
          }
        }
        for (const name of changes.keys())
          changes.set(name, {
            value: "",
            options: { ...cookieOptions, maxAge: 0 },
          });
      }
    },
    async profile(id) {
      const { data, error } = await client
        .from("account_profiles")
        .select("display_name")
        .eq("user_id", id)
        .maybeSingle();
      if (error) throw new AccountError("unavailable");
      return typeof data?.display_name === "string" ? data.display_name : "";
    },
    async saveProfile(id, displayName) {
      const { error } = await client
        .from("account_profiles")
        .upsert(
          { user_id: id, display_name: displayName },
          { onConflict: "user_id" },
        );
      if (error) throw new AccountError("unavailable");
    },
    cookies(response) {
      for (const [name, { value, options }] of changes)
        response.headers.append(
          "Set-Cookie",
          serializeCookieHeader(name, value, options),
        );
    },
  };
}
