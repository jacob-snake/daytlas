import assert from 'node:assert/strict';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';

// This is a standalone synthetic-demo build, not a replacement for the app's SSR architecture.
// No environment files, credentials, user exports, docs or private logs are copied.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('node scripts/cloudflare-static-demo.mjs\nBuilds an isolated sample-only static Next export plus a nonce-injecting Cloudflare Worker; bundles locally only. Never deploys or authenticates.');
  process.exit(0);
}
assert.equal(args.length, 0, 'Unsupported arguments');
const directory = await mkdtemp(join(tmpdir(), 'daytlas-static-demo-'));
console.log(`STATIC_DEMO_DIRECTORY=${directory}`);
const environment = Object.fromEntries(
  ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'SystemRoot', 'COMSPEC']
    .filter(name => process.env[name] !== undefined).map(name => [name, process.env[name]])
);
Object.assign(environment, {
  NEXT_TELEMETRY_DISABLED: '1', WRANGLER_SEND_METRICS: 'false',
  PUBLIC_SITE_URL: 'https://daytlas.com', NEXT_PUBLIC_POSTHOG_ENABLED: 'false',
  NEXT_PUBLIC_POSTHOG_KEY: '', OURA_CLIENT_ID: '', OURA_CLIENT_SECRET: '',
  DAYTLAS_ACCOUNTS_ENABLED: 'false', DAYTLAS_ACCOUNT_PREFERENCES_ENABLED: 'false',
});
async function filesUnder(path) {
  const found = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    assert(!entry.isSymbolicLink(), `Symlink not allowed: ${file}`);
    if (entry.isDirectory()) found.push(...await filesUnder(file));
    else found.push(file);
  }
  return found;
}
for (const name of ['src', 'public']) {
  for (const file of await filesUnder(join(root, name))) {
    assert(!relative(root, file).split(sep).some(part => part.startsWith('.')), `Hidden source file excluded: ${file}`);
    const allowed = name === 'src'
      ? ['.ts', '.tsx', '.css', '.json', '.svg', '.png', '.jpg', '.webp', '.ico', '.woff', '.woff2']
      : ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.woff', '.woff2', '.txt'];
    assert(allowed.includes(extname(file).toLowerCase()), `Unreviewed public/source file: ${file}`);
  }
  await cp(join(root, name), join(directory, name), { recursive: true });
}
for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'postcss.config.mjs', 'next-env.d.ts']) {
  assert(!(await lstat(join(root, name))).isSymbolicLink());
  await cp(join(root, name), join(directory, name));
}
async function exactReplace(file, before, after) {
  const path = join(directory, file);
  const source = await readFile(path, 'utf8');
  assert.equal(source.split(before).length, 2, `Expected exactly one transformation in ${file}`);
  await writeFile(path, source.replace(before, after));
}
await exactReplace('src/app/layout.tsx', 'import { connection } from "next/server";\n', '');
await exactReplace('src/app/layout.tsx', '  await connection();\n', '');
assert((await readFile(join(directory, 'src/proxy.ts'), 'utf8')).includes("'strict-dynamic'"));
await rm(join(directory, 'src/proxy.ts'));
await rm(join(directory, 'src/app/api'), { recursive: true });
for (const name of ['icon.tsx', 'apple-icon.tsx', 'opengraph-image.tsx', 'manifest.ts']) {
  const path = join(directory, 'src/app', name);
  const source = await readFile(path, 'utf8');
  assert(!/export\s+const\s+(?:dynamic|revalidate)\b/.test(source), `Metadata rendering changed: ${name}`);
  await writeFile(path, `export const dynamic = "force-static";\n${source}`);
}
for (const alias of ['setup', 'tags', 'trends', 'year']) {
  const page = await readFile(join(directory, 'src/app', alias, 'page.tsx'), 'utf8');
  assert(page.includes('redirect('), `Alias ${alias} is no longer a simple redirect; review required`);
  await rm(join(directory, 'src/app', alias), { recursive: true });
}
await writeFile(join(directory, 'next.config.ts'), `import type { NextConfig } from "next";\nconst config: NextConfig = { output: "export", poweredByHeader: false, images: { unoptimized: true } };\nexport default config;\n`);
function run(command, commandArgs) {
  return new Promise((accept, reject) => {
    const child = spawn(command, commandArgs, { cwd: directory, env: environment, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? accept() : reject(new Error(`${command} exited ${code}; isolated build: ${directory}`)));
  });
}
await run('npm', ['install', '--save-dev', '--save-exact', 'wrangler@4.142.0', '--no-audit', '--no-fund']);
await run('npm', ['run', 'build']);
const output = join(directory, 'out');
const outputFiles = await filesUnder(output);
const assets = {};
const pages = {};
const contentTypes = {};
const marker = randomUUID();
let scriptCount = 0;
for (const file of outputFiles) {
  const path = '/' + relative(output, file).split(sep).join('/');
  assert(!path.split('/').some(part => part.startsWith('.')), `Hidden export: ${path}`);
  assert(!/\.(?:map|log|sql|env)$/.test(path), `Private/build-only output: ${path}`);
  assert(!path.startsWith('/api/'), `API should not export: ${path}`);
  if (path.endsWith('.html')) {
    const html = await readFile(file, 'utf8');
    assert(!/\bnonce\s*=|data-daytlas-script|\bon\w+\s*=|http-equiv\s*=\s*["']?Content-Security-Policy/i.test(html), `Unexpected executable markup: ${path}`);
    const tags = html.match(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi) ?? [];
    assert.equal(tags.length, (html.match(/<script\b/gi) ?? []).length, `Malformed script: ${path}`);
    for (const tag of tags) {
      const src = tag.match(/\bsrc="([^"]+)"/i)?.[1];
      assert(!src || src.startsWith('/_next/static/'), `Unexpected script source: ${path}`);
    }
    scriptCount += tags.length;
    await writeFile(file, html.replace(/<script\b/gi, `<script data-daytlas-script="${marker}"`));
    pages[path] = path;
    const route = path === '/index.html' ? '/' : path.slice(0, -5);
    pages[route] = path;
    if (route !== '/') pages[route + '/'] = path;
  } else {
    assets[path] = path;
    if (!extname(path)) {
      const bytes = await readFile(file);
      assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `Unknown extensionless asset: ${path}`);
      contentTypes[path] = 'image/png';
    }
  }
}
for (const page of ['/', '/app', '/app/onboarding', '/app/profile', '/connect', '/account', '/install']) assert(pages[page], `Required route absent: ${page}`);
for (const asset of ['/manifest.webmanifest', '/app-icons/192', '/app-icons/512']) assert(assets[asset], `Required PWA asset absent: ${asset}`);
await mkdir(join(directory, 'worker'));
await cp(join(root, 'deploy/static-demo-worker.mjs'), join(directory, 'worker/index.mjs'));
await cp(join(root, 'deploy/oura-worker.mjs'), join(directory, 'worker/oura-worker.mjs'));
await cp(join(root, 'src/lib/account'), join(directory, 'worker/account'), { recursive: true });
await writeFile(join(directory, 'worker/static-demo-manifest.mjs'), `export const assets = ${JSON.stringify(assets)};\nexport const pages = ${JSON.stringify(pages)};\nexport const marker = ${JSON.stringify(marker)};\nexport const contentTypes = ${JSON.stringify(contentTypes)};\n`);
await writeFile(join(directory, 'wrangler.jsonc'), JSON.stringify({
  name: 'daytlas-static-demo-proof', main: 'worker/index.mjs', compatibility_date: '2026-09-27',
  workers_dev: true, assets: { directory: './out', binding: 'ASSETS', run_worker_first: true, html_handling: 'none' },
  observability: { enabled: false },
}, null, 2) + '\n');
await run('npx', ['--no-install', 'wrangler', 'deploy', '--dry-run', '--outdir', 'worker-bundle']);
await writeFile(join(directory, 'static-demo-report.json'), JSON.stringify({
  createdAt: new Date().toISOString(), sourceRoot: root, directory,
  build: 'passed', bundlingDryRun: 'passed', deployed: false, freeCpuVerified: false,
  rawUserDataIncluded: false, externalServicesEnabled: false,
  files: outputFiles.length, htmlFiles: Object.values(pages).filter((p, i, list) => list.indexOf(p) === i).length,
  scriptCount, next: JSON.parse(await readFile(join(directory, 'package.json'), 'utf8')).dependencies.next,
  wrangler: '4.142.0',
}, null, 2) + '\n');
console.log(`Static demo built. No deployment. Preview from ${directory}: npx wrangler dev --port 3020 --ip 127.0.0.1`);
