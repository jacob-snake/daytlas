import { brand } from "@/lib/brand-config";
import { NextRequest, NextResponse } from "next/server";
import {
  oauthConfig,
  PRIVATE_HEADERS,
  STATE_COOKIE,
  validTokens,
} from "../_shared";

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function scriptString(value: string) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function page(body: string, status = 200, script = "") {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const response = new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect · ${escapeHtml(brand.name)}</title></head><body>${body}${script ? `<script nonce="${nonce}">${script}</script>` : ""}</body></html>`,
    {
      status,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      },
    },
  );
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
  // Remove the previous application's broader cookie during migration too.
  response.headers.append(
    "Set-Cookie",
    `${STATE_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
  return response;
}

function failure(message: string, status: number) {
  return page(
    `<main><h1>We couldn’t connect to Oura</h1><p>${message}</p><a href="/connect">Back to connection settings</a></main>`,
    status,
  );
}

export async function GET(req: NextRequest) {
  const state = req.nextUrl.searchParams.get("state");
  const expectedState = req.cookies.get(STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState)
    return failure("This connection request expired. Please start again.", 400);
  if (req.nextUrl.searchParams.has("error"))
    return failure(
      "Access wasn’t granted. You can try again whenever you’re ready.",
      400,
    );
  const code = req.nextUrl.searchParams.get("code");
  if (!code || code.length > 8192)
    return failure(
      "The connection response was incomplete. Please start again.",
      400,
    );
  const config = oauthConfig(req);
  if (!config)
    return failure(
      "Oura connection is not configured on this installation.",
      503,
    );
  try {
    const tokenResponse = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!tokenResponse.ok)
      return failure(
        "Oura couldn’t complete this connection. Please try again.",
        502,
      );
    const tokens = validTokens(await tokenResponse.json());
    if (!tokens)
      return failure(
        "Oura returned an incomplete connection. Please try again.",
        502,
      );
    // JSON is embedded in a script context, so escape HTML delimiters as well.
    const payload = JSON.stringify({
      token: tokens.access_token,
      refresh: tokens.refresh_token ?? null,
      expiresAt: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : null,
    })
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");
    return page(
      `<main><h1>Connecting your browser</h1><p id="status">Finishing your secure connection…</p><a href="/connect">Back to ${escapeHtml(brand.name)}</a></main>`,
      200,
      `
      (async () => {
        history.replaceState(null, "", "/api/auth/callback");
        try {
          const t = ${payload};
          for (const key of Object.keys(localStorage)) if (key.startsWith("woura.")) localStorage.removeItem(key);
          await new Promise((resolve, reject) => {
            const request = indexedDB.deleteDatabase("woura");
            request.onsuccess = resolve;
            request.onerror = request.onblocked = () => reject(new Error(${scriptString(`Close other ${brand.name} tabs and try connecting again.`)}));
          });
          localStorage.setItem("woura.cacheScope", crypto.randomUUID());
          if (t.refresh) localStorage.setItem("woura.refresh", t.refresh);
          if (t.expiresAt) localStorage.setItem("woura.expiresAt", String(t.expiresAt));
          localStorage.setItem("woura.mode", "live");
          localStorage.setItem("woura.token", t.token);
          location.replace("/app");
        } catch {
          try { for (const key of ["woura.token", "woura.refresh", "woura.expiresAt", "woura.cacheScope", "woura.mode"]) localStorage.removeItem(key); } catch {}
          document.getElementById("status").textContent = ${scriptString(`Your browser could not save the connection or clear the previous session. Enable site storage, close other ${brand.name} tabs, and try again.`)};
        }
      })();
    `,
    );
  } catch {
    return failure(
      "Oura is temporarily unavailable. Please try again shortly.",
      502,
    );
  }
}
