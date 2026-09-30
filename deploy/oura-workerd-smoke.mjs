// Run: node deploy/oura-workerd-smoke.mjs /absolute/path/to/wrangler
// Uses local workerd and intentionally invalid, synthetic credentials only.
// One request reaches Oura's token endpoint; no account data is accessed.
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import assert from "node:assert/strict";
const binary = process.argv[2];
if (!binary) throw new Error("Pass the installed Wrangler executable path.");
const server = createServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const dir = await mkdtemp(join(tmpdir(), "mebyday-oura-smoke-"));
const source = fileURLToPath(new URL("./oura-worker.mjs", import.meta.url));
await writeFile(
  join(dir, "worker.mjs"),
  `
import { handleOura } from ${JSON.stringify(source)};
export default { async fetch() {
  const request = new Request('https://mebyday.com/api/auth/refresh', {
    method: 'POST', headers: {'Content-Type':'application/json',Origin:'https://mebyday.com'},
    body: JSON.stringify({refresh_token:'synthetic-runtime-smoke'})
  });
  return handleOura(request, {
    OURA_ENABLED:'true', OURA_CLIENT_ID:'synthetic-runtime-smoke',
    OURA_CLIENT_SECRET:'synthetic-runtime-smoke',
    OURA_REDIRECT_URI:'https://mebyday.com/api/auth/callback'
  });
}};
`,
);
await writeFile(
  join(dir, "wrangler.jsonc"),
  JSON.stringify({
    name: "mebyday-oura-runtime-smoke",
    main: "worker.mjs",
    compatibility_date: "2026-09-27",
    workers_dev: false,
  }),
);
const child = spawn(
  binary,
  [
    "dev",
    "--local",
    "--config",
    join(dir, "wrangler.jsonc"),
    "--ip",
    "127.0.0.1",
    "--port",
    String(port),
    "--show-interactive-dev-session=false",
  ],
  { stdio: "inherit", detached: true },
);
let spawnError;
child.on("error", (error) => {
  spawnError = error;
});
try {
  let result;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null)
      throw new Error("Local Wrangler exited before the check.");
    try {
      result = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(18000),
      });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.ok(result, "Local workerd did not start");
  assert.equal(
    result.status,
    401,
    "Synthetic refresh must reach provider rejection, not runtime 502",
  );
  assert.match(result.headers.get("cache-control"), /no-store/);
  assert.deepEqual(await result.json(), {
    error: "Connection expired. Please connect again.",
  });
  console.log(
    "PASS: native workerd executes Oura token exchange and safely handles synthetic credential rejection.",
  );
} finally {
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {}
  await new Promise((resolve) => {
    if (child.exitCode !== null || spawnError) resolve();
    else child.once("exit", resolve);
  });
  await rm(dir, { recursive: true, force: true });
}
