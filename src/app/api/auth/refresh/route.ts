import { NextRequest } from "next/server";
import {
  isSameOrigin,
  oauthConfig,
  privateJson,
  validTokens,
} from "../_shared";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req))
    return privateJson({ error: "Origin not allowed" }, 403);
  if (
    !req.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    return privateJson({ error: "Expected JSON" }, 415);
  const config = oauthConfig(req);
  if (!config)
    return privateJson({ error: "Oura connection is not configured" }, 503);
  let refreshToken: string;
  try {
    const reader = req.body?.getReader();
    if (!reader) return privateJson({ error: "Missing request body" }, 400);
    const decoder = new TextDecoder();
    let text = "";
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 20_000) {
        await reader.cancel();
        return privateJson({ error: "Request too large" }, 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const body = JSON.parse(text);
    if (
      !body ||
      typeof body.refresh_token !== "string" ||
      !body.refresh_token.trim() ||
      body.refresh_token.length > 16_384
    )
      return privateJson({ error: "Invalid refresh token" }, 400);
    refreshToken = body.refresh_token;
  } catch {
    return privateJson({ error: "Invalid JSON" }, 400);
  }
  try {
    const response = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      return privateJson(
        { error: "Connection expired. Please connect again." },
        response.status === 400 || response.status === 401 ? 401 : 502,
      );
    const tokens = validTokens(await response.json());
    if (!tokens)
      return privateJson({ error: "Invalid response from Oura" }, 502);
    return privateJson(tokens);
  } catch {
    return privateJson({ error: "Oura is temporarily unavailable" }, 502);
  }
}
