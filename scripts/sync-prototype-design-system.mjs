#!/usr/bin/env node
/** Embed the shared product CSS in sandboxed mockups and regenerate their previews. */
import {readFile, writeFile, readdir, access} from 'node:fs/promises';
import {homedir} from 'node:os';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const project = fileURLToPath(new URL('../', import.meta.url));
const cssPath = resolve(project, 'src/styles/design-system.css');
const pairs = [
  ['daytlas-email-entry.html', 'email-entry-preview.html'],
  ['daytlas-life-journey.html', 'product-journey-preview.html'],
];
const css = (await readFile(cssPath, 'utf8')).trim();
const digest = createHash('sha256').update(css).digest('hex');
const block = `<style id="daytlas-design-system" data-source="src/styles/design-system.css" data-sha256="${digest}">\n${css}\n</style>`;
const generated = /<style\b[^>]*\bid="daytlas-design-system"[^>]*>[\s\S]*?<\/style>/g;
const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const check = process.argv.includes('--check');

async function rendererPath() {
  const flag = process.argv.indexOf('--renderer');
  if (flag !== -1) {
    if (!process.argv[flag + 1]) throw new Error('--renderer requires a render.py path.');
    return resolve(process.argv[flag + 1]);
  }
  if (process.env.DAYTLAS_VISUALIZE_RENDERER) return resolve(process.env.DAYTLAS_VISUALIZE_RENDERER);
  const bundled = join(homedir(), '.codex/plugins/cache/openai-bundled/visualize');
  let versions;
  try { versions = await readdir(bundled); }
  catch { throw new Error('Set DAYTLAS_VISUALIZE_RENDERER or pass --renderer /path/to/visualize/scripts/render.py.'); }
  for (const version of versions.sort((a, b) => b.localeCompare(a, undefined, {numeric: true}))) {
    const candidate = join(bundled, version, 'skills/visualize/scripts/render.py');
    try { await access(candidate); return candidate; } catch { /* Try the next installed version. */ }
  }
  throw new Error('No bundled visualize renderer found. Pass --renderer /path/to/render.py.');
}

// Resolve dependencies before editing either canonical fragment.
const renderer = check ? null : await rendererPath();
for (const [sourceName, previewName] of pairs) {
  const sourcePath = resolve(project, 'docs/brand/prototype-sources', sourceName);
  const previewPath = resolve(project, 'docs/brand', previewName);
  const source = await readFile(sourcePath, 'utf8');
  const matches = source.match(generated) ?? [];
  if (matches.length > 1) throw new Error(`Duplicate shared stylesheet in ${sourceName}.`);
  const updated = matches.length ? source.replace(generated, () => block) : source.replace('</style>', `</style>\n${block}`);
  if (!updated.includes(block)) throw new Error(`No local stylesheet insertion point in ${sourceName}.`);
  if (check) {
    if (source !== updated) throw new Error(`${sourceName} has stale shared CSS; run this script without --check.`);
    const preview = await readFile(previewPath, 'utf8');
    if (!preview.includes(escapeHtml(source))) throw new Error(`${previewName} does not contain the current canonical fragment.`);
  } else {
    if (source !== updated) await writeFile(sourcePath, updated);
    execFileSync('python3', [renderer, sourcePath, previewPath, '--force'], {stdio: 'pipe'});
  }
}
const standaloneCss = resolve(project, 'docs/brand/ui-round-9/assets/design-system.css');
if (check) {
  if ((await readFile(standaloneCss, 'utf8')).trim() !== css) throw new Error('UI round9 has stale design-system CSS.');
} else await writeFile(standaloneCss, `${css}\n`);
const standaloneHtml = resolve(project, 'docs/brand/ui-round-9/index.html');
const standaloneSource = await readFile(standaloneHtml, 'utf8');
const standaloneUpdated = standaloneSource.replace(/href="assets\/design-system\.css(?:\?[^"\s]*)?"/, `href="assets/design-system.css?v=${digest.slice(0, 12)}"`);
if (check) {
  if (standaloneSource !== standaloneUpdated) throw new Error('UI round9 has a stale design-system cache version.');
} else if (standaloneSource !== standaloneUpdated) await writeFile(standaloneHtml, standaloneUpdated);
console.log(`${check ? 'Verified' : 'Synced'} shared design system and both prototype previews (${digest.slice(0, 12)}).`);
