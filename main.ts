// Hand in the make.fun frontend: copy app/ and screenshots/ from beside this
// file to /output and write /output/dossier.json with the vendored make.fun
// library (vendor/makefun-frontend.ts, the scorer's own copy, byte for byte).
// Node 22, standard library only, no build step.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program refuses to hand in a broken entry instead of writing a
// dossier the scorer would reject: it checks that app/index.html exists,
// that screenshots/ holds 1-3 PNG or JPEG files each at most 256 KiB, and
// that app/ is within the gate's file and byte caps, then reports the
// counts and the first-load totals it handed in.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

// The gate's caps (reference/gate.json): only text_max_bytes shapes the
// dossier's bytes; the others refuse an entry the scorer would refuse.
const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
};

function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

// --- pre-flight: refuse a broken entry before anything is copied ---------
if (!existsSync(join(appDir, 'index.html'))) fail('app/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');
const shots = readdirSync(shotsDir)
  .filter((name) => /\.(png|jpe?g)$/i.test(name))
  .sort();
if (shots.length === 0) fail('screenshots/ holds no PNG or JPEG image');
if (shots.length > CAPS.screenshots.max) fail(`screenshots/ holds ${shots.length} images, over the ${CAPS.screenshots.max} allowed`);
for (const name of shots) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > CAPS.screenshots.max_bytes) fail(`screenshots/${name} is ${size} bytes, over the ${CAPS.screenshots.max_bytes} allowed`);
}

// --- copy -----------------------------------------------------------------
mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// --- dossier --------------------------------------------------------------
// buildDossier throws on an entry the scorer would refuse; writing it is
// the hand-in. Read it back and check it round-trips before reporting.
const dossier = buildDossier(out, CAPS);
writeFileSync(join(out, 'dossier.json'), dossier);
const back = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8'));
if (back.schema !== 'makefun/dossier/v1') fail(`dossier.json came back with schema ${back.schema}`);
if ((back.images ?? []).length !== shots.length) {
  fail(`dossier.json lists ${(back.images ?? []).length} images for ${shots.length} screenshots`);
}
const totals = /^Totals:.*$/m.exec(back.text ?? '')?.[0] ?? '';

// Count the app's files (not its directories) for the report.
const appFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (name.isFile()) appFiles.push(p);
  }
})(join(out, 'app'));

console.log(`handed in ${appFiles.length} app files and ${shots.length} screenshot(s): ${shots.join(', ')}`);
if (totals) console.log(totals);
console.log(`dossier.json: ${Buffer.byteLength(dossier, 'utf8')} bytes -> ${join(out, 'dossier.json')}`);
