import type { AccountConfiguration } from "./config";

export type AccountUser = { id: string; email: string; verified: boolean };
export type AccountProvider = {
  user: () => Promise<AccountUser | null>;
  requestCode: (email: string) => Promise<void>;
  verifyCode: (email: string, code: string) => Promise<AccountUser | null>;
  signOut: () => Promise<void>;
  profile: (id: string) => Promise<string>;
  saveProfile: (id: string, displayName: string) => Promise<void>;
  cookies: (response: Response) => void;
};
export class AccountError extends Error {
  constructor(public code: "rate_limited" | "invalid_code" | "unavailable") {
    super(code);
  }
}

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "Referrer-Policy": "no-referrer",
  Vary: "Cookie",
};
function json(value: unknown, status = 200, provider?: AccountProvider) {
  const response = Response.json(value, { status, headers });
  if (status === 429) response.headers.set("Retry-After", "60");
  provider?.cookies(response);
  return response;
}

function email(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length <= 254 &&
    /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(normalized)
    ? normalized
    : null;
}

async function body(request: Request): Promise<Record<string, unknown> | null> {
  if (
    !/^application\/json(?:;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 4096) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function accountHandlers(
  configuration: () => AccountConfiguration | null,
  createProvider: (
    request: Request,
    config: AccountConfiguration,
  ) => AccountProvider,
) {
  return {
    async GET(request: Request) {
      const config = configuration();
      if (!config)
        return json({ enabled: false, account: null, preferences: false });
      const provider = createProvider(request, config);
      try {
        const user = await provider.user();
        if (!user?.verified)
          return json(
            { enabled: true, account: null, preferences: config.preferences },
            200,
            provider,
          );
        const displayName = config.preferences
          ? await provider.profile(user.id)
          : "";
        return json(
          {
            enabled: true,
            account: { email: user.email, displayName },
            preferences: config.preferences,
          },
          200,
          provider,
        );
      } catch {
        return json({ error: "unavailable" }, 503, provider);
      }
    },
    async POST(request: Request) {
      const config = configuration();
      if (!config) return json({ error: "disabled" }, 503);
      // A missing Origin is not accepted for a credential-bearing mutation.
      if (
        request.headers.get("origin") !== config.origin ||
        request.headers.get("sec-fetch-site") === "cross-site"
      ) {
        return json({ error: "invalid_origin" }, 403);
      }
      const input = await body(request);
      if (!input) return json({ error: "invalid_request" }, 400);
      const allowed: Record<string, string[]> = {
        request_code: ["action", "email"],
        verify_code: ["action", "email", "code"],
        sign_out: ["action"],
        save_profile: ["action", "displayName"],
      };
      if (
        typeof input.action !== "string" ||
        !Object.hasOwn(allowed, input.action) ||
        Object.keys(input).some(
          (key) => !allowed[input.action as string].includes(key),
        )
      ) {
        return json({ error: "invalid_request" }, 400);
      }
      const address = email(input.email);
      if (
        (input.action === "request_code" || input.action === "verify_code") &&
        !address
      )
        return json({ error: "invalid_email" }, 400);
      if (
        input.action === "verify_code" &&
        (typeof input.code !== "string" || !/^\d{6}$/.test(input.code))
      )
        return json({ error: "invalid_code" }, 400);
      if (
        input.action === "save_profile" &&
        (!config.preferences ||
          typeof input.displayName !== "string" ||
          input.displayName.trim().length > 40 ||
          /[\u0000-\u001f\u007f]/.test(input.displayName))
      )
        return json({ error: "invalid_request" }, 400);
      const provider = createProvider(request, config);
      try {
        if (input.action === "request_code") {
          await provider.requestCode(address!);
          return json({ ok: true }, 200, provider);
        }
        if (input.action === "verify_code") {
          const user = await provider.verifyCode(
            address!,
            input.code as string,
          );
          if (!user?.verified || user.email.toLowerCase() !== address) {
            await provider.signOut();
            return json({ error: "invalid_code" }, 400, provider);
          }
          return json({ ok: true }, 200, provider);
        }
        if (input.action === "sign_out") {
          await provider.signOut();
          return json({ ok: true }, 200, provider);
        }
        const user = await provider.user();
        if (!user?.verified)
          return json({ error: "sign_in_required" }, 401, provider);
        await provider.saveProfile(
          user.id,
          (input.displayName as string).trim(),
        );
        return json({ ok: true }, 200, provider);
      } catch (error) {
        const code = error instanceof AccountError ? error.code : "unavailable";
        return json(
          { error: code },
          code === "rate_limited" ? 429 : code === "invalid_code" ? 400 : 503,
          provider,
        );
      }
    },
  };
}
