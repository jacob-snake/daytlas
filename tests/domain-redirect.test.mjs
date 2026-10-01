import { test } from "node:test";
import assert from "node:assert/strict";
import { previousDomainRedirect } from "../src/lib/domain-redirect.ts";
test("retired hosts redirect paths and ordinary queries to the canonical host", () => {
  for (const host of ["mebyday.com", "www.mebyday.com"]) {
    const response = previousDomainRedirect(
      new Request(`https://${host}/app/trends?range=30&view=weekly`),
    );
    assert.equal(response.status, 308);
    assert.equal(
      response.headers.get("Location"),
      "https://daytlas.com/app/trends?range=30&view=weekly",
    );
    assert.match(response.headers.get("Cache-Control"), /no-store/);
  }
  for (const host of [
    "daytlas.com",
    "www.daytlas.com",
    "mebyday.com.evil.example",
    "localhost:3011",
  ])
    assert.equal(
      previousDomainRedirect(new Request(`https://${host}/app`)),
      null,
    );
});
test("old OAuth callbacks never forward codes, and POST bodies are never replayed", () => {
  const callback = previousDomainRedirect(
    new Request(
      "https://mebyday.com/api/auth/callback?code=synthetic-secret&state=old",
    ),
  );
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("Location"), "https://daytlas.com/connect");
  const post = previousDomainRedirect(
    new Request("https://mebyday.com/api/auth/refresh", {
      method: "POST",
      body: "synthetic-sensitive-body",
    }),
  );
  assert.equal(post.status, 409);
  assert.equal(post.body, null);
});
