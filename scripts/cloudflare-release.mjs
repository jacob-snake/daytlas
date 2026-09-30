import {
  cp,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Deliberately separate from cloudflare-probe.mjs, which can never deploy.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(`Usage: node scripts/cloudflare-release.mjs [--deploy]
Default: fresh sample-only source copy, pinned adapter install, build and bundling dry run.
--deploy: after those checks, verify the existing Worker has no secrets, then publish
to the existing daytlas Worker, daytlas.com and www.daytlas.com using Wrangler login.
No login, DNS nameserver changes, secrets, database or email setup is performed.
The original checkout and cloudflare-probe.mjs remain unchanged.
Dynamic SSR currently exceeds the Free CPU allowance in measured traffic.
Deployment also requires DAYTLAS_DYNAMIC_RUNTIME_REVIEWED=true after resolving
runtime suitability. Use the separate static-demo release for the Free demo.`);
  process.exit(0);
}
if (args.length > 1 || (args.length === 1 && args[0] !== "--deploy")) {
  throw new Error("Unsupported arguments. Use --help.");
}
const deploy = args[0] === "--deploy";
if (deploy && process.env.DAYTLAS_DYNAMIC_RUNTIME_REVIEWED !== "true") {
  throw new Error(
    "Dynamic SSR is not cleared for the Free CPU budget. Resolve runtime suitability before explicitly setting DAYTLAS_DYNAMIC_RUNTIME_REVIEWED=true. No build or upload started.",
  );
}
const versions = { adapter: "1.20.6", wrangler: "4.142.0" };
const configPath = join(
  projectRoot,
  "deploy/cloudflare-wrangler.production.jsonc",
);
const config = JSON.parse(await readFile(configPath, "utf8"));
const expectedVariables = [
  "PUBLIC_SITE_URL",
  "OURA_CLIENT_ID",
  "OURA_CLIENT_SECRET",
  "OURA_REDIRECT_URI",
  "DAYTLAS_ACCOUNTS_ENABLED",
  "DAYTLAS_ACCOUNT_PREFERENCES_ENABLED",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_POSTHOG_ENABLED",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
];
if (
  config.name !== "daytlas" ||
  config.services?.[0]?.service !== config.name ||
  config.vars?.PUBLIC_SITE_URL !== "https://daytlas.com" ||
  config.vars?.OURA_CLIENT_ID !== "" ||
  config.vars?.OURA_CLIENT_SECRET !== "" ||
  config.vars?.DAYTLAS_ACCOUNTS_ENABLED !== "false" ||
  config.vars?.DAYTLAS_ACCOUNT_PREFERENCES_ENABLED !== "false" ||
  config.vars?.NEXT_PUBLIC_POSTHOG_ENABLED !== "false" ||
  config.vars?.SUPABASE_URL !== "" ||
  config.vars?.SUPABASE_PUBLISHABLE_KEY !== "" ||
  config.vars?.NEXT_PUBLIC_POSTHOG_KEY !== "" ||
  config.vars?.OURA_REDIRECT_URI !== "" ||
  Object.keys(config.vars ?? {}).some(
    (name) => !expectedVariables.includes(name),
  ) ||
  config.routes?.length !== 2 ||
  !config.routes.every(
    (route) =>
      route.custom_domain === true &&
      ["daytlas.com", "www.daytlas.com"].includes(route.pattern),
  ) ||
  new Set(config.routes.map((route) => route.pattern)).size !== 2
) {
  throw new Error(
    "Release configuration is no longer the reviewed sample-only target. Review the release workflow before enabling services.",
  );
}

const directory = await mkdtemp(join(tmpdir(), "daytlas-release-"));
const sourcePaths = [
  "src",
  "public",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "tsconfig.json",
  "postcss.config.mjs",
  "next-env.d.ts",
];
const copyOptions = {
  recursive: true,
  filter: async (source) => {
    const name = source.split(/[\\/]/).at(-1);
    if (
      name.startsWith(".env") ||
      name.startsWith(".dev.vars") ||
      name === ".npmrc"
    )
      return false;
    if ((await lstat(source)).isSymbolicLink())
      throw new Error(
        "Source symlinks are not accepted in the isolated release copy.",
      );
    return true;
  },
};
for (const name of sourcePaths)
  await cp(join(projectRoot, name), join(directory, name), copyOptions);
await cp(
  join(projectRoot, "deploy/cloudflare-open-next.config.example"),
  join(directory, "open-next.config.ts"),
  copyOptions,
);
await cp(configPath, join(directory, "wrangler.jsonc"), copyOptions);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
async function sourceHashes(folder) {
  const entries = await readdir(folder, { withFileTypes: true });
  const result = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) Object.assign(result, await sourceHashes(path));
    else
      result[relative(directory, path).replaceAll("\\", "/")] = sha256(
        await readFile(path),
      );
  }
  return result;
}
const hashes = await sourceHashes(directory);

// Do not forward .env values, NODE_OPTIONS, API tokens or account identifiers to builds.
// HOME is preserved for normal npm/OS operation, not repurposed or copied.
const environment = Object.fromEntries(
  [
    "PATH",
    "HOME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "LANG",
    "LC_ALL",
    "SystemRoot",
    "COMSPEC",
  ]
    .filter((name) => process.env[name] !== undefined)
    .map((name) => [name, process.env[name]]),
);
Object.assign(environment, config.vars, {
  CI: "true",
  NEXT_TELEMETRY_DISABLED: "1",
  WRANGLER_SEND_METRICS: "false",
  WRANGLER_LOG_SANITIZE: "true",
});
const deploymentEnvironment = { ...environment };
// Optional account selector, never bundled or written to the release report.
if (deploy && process.env.CLOUDFLARE_ACCOUNT_ID) {
  if (!/^[a-f0-9]{32}$/i.test(process.env.CLOUDFLARE_ACCOUNT_ID))
    throw new Error("Invalid Cloudflare account selector.");
  deploymentEnvironment.CLOUDFLARE_ACCOUNT_ID =
    process.env.CLOUDFLARE_ACCOUNT_ID;
}

function run(
  command,
  commandArgs,
  { capture = false, env = environment } = {},
) {
  return new Promise((accept, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: directory,
      env,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    if (capture) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      // Never echo credential-bearing tool diagnostics from a captured preflight.
      child.stderr.resume();
    }
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? accept(output)
        : reject(
            new Error(
              `${command} exited with ${code}. No captured credentials or diagnostics were printed.`,
            ),
          ),
    );
  });
}

const report = {
  createdAt: new Date().toISOString(),
  target: "daytlas",
  domains: ["daytlas.com", "www.daytlas.com"],
  mode: deploy ? "explicit-deploy" : "build-only",
  sourceFiles: hashes,
  sourceFingerprint: sha256(JSON.stringify(hashes)),
  ...versions,
  compatibilityDate: config.compatibility_date,
  build: "pending",
  bundlingDryRun: "pending",
  deployed: false,
  ouraEnabled: false,
  accountsEnabled: false,
  analyticsEnabled: false,
  freeCpuBudgetVerified: false,
};
const reportPath = join(directory, "cloudflare-release-report.json");
const saveReport = () =>
  writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
await saveReport();
console.log(`Fresh sample-only release directory: ${directory}`);

try {
  // npm ci starts from the checked-out application lock. Adapter integration changes
  // only the temporary package/lock; retain that combined lock with the release.
  await run("npm", ["ci", "--no-audit", "--no-fund"]);
  await run("npm", [
    "install",
    "--save-dev",
    "--save-exact",
    `@opennextjs/cloudflare@${versions.adapter}`,
    `wrangler@${versions.wrangler}`,
    "--no-audit",
    "--no-fund",
  ]);
  report.resolvedPackageLockSha256 = sha256(
    await readFile(join(directory, "package-lock.json")),
  );
  await run("npx", ["--no-install", "opennextjs-cloudflare", "build"]);
  report.build = "passed";
  await run("npx", [
    "--no-install",
    "wrangler",
    "deploy",
    "--dry-run",
    "--outdir",
    "cloudflare-bundle-report",
  ]);
  report.bundlingDryRun = "passed";
  await saveReport();

  if (deploy) {
    // Deployment preserves Worker secrets. Refuse rather than accidentally turning
    // this sample workflow into a real-data release or overwriting a later launch.
    const output = await run(
      "npx",
      ["--no-install", "wrangler", "secret", "list", "--format", "json"],
      { capture: true, env: deploymentEnvironment },
    );
    let secrets;
    try {
      secrets = JSON.parse(output);
    } catch {
      throw new Error(
        "Could not verify the Worker's secret-free state. No upload attempted.",
      );
    }
    if (!Array.isArray(secrets) || secrets.length)
      throw new Error(
        "Existing Worker secrets detected. This sample-only release refuses to overwrite a configured integration. No upload attempted.",
      );
    await run("npx", ["--no-install", "wrangler", "deploy"], {
      env: deploymentEnvironment,
    });
    report.deployed = true;
    await saveReport();
    console.log(
      "Sample release uploaded. Verify HTTPS, demo, onboarding, install metadata and disabled integration endpoints. Record Wrangler's version ID for rollback.",
    );
  } else {
    console.log(
      "Build and dry run passed. Nothing uploaded. Review this directory; --deploy is required for a new live release.",
    );
  }
  console.log(`Release report: ${reportPath}`);
} catch (error) {
  report.failed = true;
  await saveReport();
  throw error;
}
