import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Build a separate, sample-only copy. Never deploy, authenticate, or copy .env.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Usage: node scripts/cloudflare-probe.mjs\nCreates an isolated temporary copy, installs pinned adapter tools, builds and dry-runs bundling. No deployment or Cloudflare login. Source checkout remains unchanged.");
  process.exit(0);
}
if (args.length) throw new Error("Unsupported arguments. Use --help.");

const directory = await mkdtemp(join(tmpdir(), "mebyday-cloudflare-"));
for (const name of [
  "src", "public", "package.json", "package-lock.json", "next.config.ts",
  "tsconfig.json", "postcss.config.mjs", "next-env.d.ts",
]) {
  await cp(join(projectRoot, name), join(directory, name), { recursive: true });
}
await cp(join(projectRoot, "deploy/cloudflare-open-next.config.example"), join(directory, "open-next.config.ts"));
await cp(join(projectRoot, "deploy/cloudflare-wrangler.example.jsonc"), join(directory, "wrangler.jsonc"));

// Build public variables explicitly. Do not inherit account credentials or local secrets.
const environment = Object.fromEntries(
  ["PATH", "HOME", "TMPDIR", "TMP", "TEMP", "LANG", "LC_ALL", "SystemRoot", "COMSPEC"]
    .filter((name) => process.env[name] !== undefined)
    .map((name) => [name, process.env[name]]),
);
Object.assign(environment, {
  NEXT_TELEMETRY_DISABLED: "1",
  WRANGLER_SEND_METRICS: "false",
  PUBLIC_SITE_URL: "https://mebyday.com",
  NEXT_PUBLIC_POSTHOG_ENABLED: "false",
  NEXT_PUBLIC_POSTHOG_KEY: "",
  OURA_CLIENT_ID: "",
  OURA_CLIENT_SECRET: "",
});

function run(command, commandArgs) {
  return new Promise((accept, reject) => {
    const child = spawn(command, commandArgs, { cwd: directory, env: environment, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? accept() : reject(new Error(`${command} exited with ${code}`)));
  });
}

console.log(`Isolated compatibility build: ${directory}`);
await run("npm", ["install", "--save-dev", "--save-exact", "@opennextjs/cloudflare@1.20.6", "wrangler@4.142.0", "--no-audit", "--no-fund"]);
await run("npx", ["--no-install", "opennextjs-cloudflare", "build"]);
await run("npx", ["--no-install", "wrangler", "deploy", "--dry-run", "--outdir", "cloudflare-bundle-report"]);

const packageJson = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
await writeFile(join(directory, "cloudflare-probe-report.json"), JSON.stringify({
  createdAt: new Date().toISOString(),
  build: "passed",
  bundlingDryRun: "passed",
  deployed: false,
  realOuraTested: false,
  freeCpuBudgetVerified: false,
  next: packageJson.dependencies.next,
  adapter: "1.20.6",
  wrangler: "4.142.0",
  compatibilityDate: "2026-09-20",
}, null, 2) + "\n");
console.log(`Build complete. No deployment. To preview, change to ${directory} and run: npx wrangler dev --port 3018 --ip 127.0.0.1`);
