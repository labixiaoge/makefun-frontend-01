// makefun-frontend-01 entry (Node 22, standard library only): the frontend is this directory's app/
// folder, plain static files a browser opens at app/index.html (ES modules, CSS, no build step), reading
// make.fun's public API at https://make.fun/api. The program hands it in: it copies app/ and screenshots/
// from beside this file to /output and writes /output/dossier.json, the summary the judge reads (your
// screenshots, the first load's files and bytes, and your source), with the vendored make.fun library.
// Leave vendor/makefun-frontend.ts as it is: the scorer requires dossier.json to be byte for byte what
// its own copy writes.
//
// The frontend itself: a board of the open bounties, a page for each bounty, that bounty's leaderboard,
// and an account's public profile, on hash routes (#/, #/bounty/<slug>, #/bounty/<slug>/leaderboard,
// #/u/<handle>). It fetches only make.fun's public GET API, revalidates with ETag / If-None-Match, and
// stays small: no framework, one stylesheet, five small modules.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse
// an entry the scorer would refuse (more than 3 screenshots or one over 256 KiB; more than 993 files
// and directories in app/ or 16 MiB of app files; app/ counts beside /output's own 1000-entry cap,
// its screenshots/ and dossier.json).
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 3, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216,
} as const;

const REQUIRED_APP_FILES = ['index.html', 'main.js', 'api.js', 'views.js', 'format.js', 'style.css'] as const;

/** Walk a directory and count every file and directory under it. */
function countTree(root: string): { files: number; dirs: number; bytes: number } {
  let files = 0;
  let dirs = 0;
  let bytes = 0;
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        dirs += 1;
        walk(path);
      } else if (entry.isFile()) {
        files += 1;
        bytes += statSync(path).size;
      }
    }
  };
  walk(root);
  return { files, dirs, bytes };
}

/** Fail loudly with a message the builder can act on, instead of handing in a broken entry. */
function fail(message: string): never {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');

// The app must be complete before anything is copied: a missing module is a broken first load.
for (const name of REQUIRED_APP_FILES) {
  if (!existsSync(join(appDir, name))) fail(`app/${name} is missing; the frontend cannot load without it`);
}

// Exactly three screenshots, each a PNG or JPEG, each under the scorer's 256 KiB cap.
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort() : [];
if (shots.length !== 3) fail(`screenshots/ must hold exactly 3 PNG or JPEG files, found ${shots.length}`);
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > 262144) fail(`screenshots/${shot} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(appDir, join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The owner file travels with the repo so the platform can tie the entry to the account; the dossier
// is built from /output alone, so check the source copy here, before the build, not after.
const ownerPath = join(here, '.makefun', 'owner.json');
if (!existsSync(ownerPath)) fail('.makefun/owner.json is missing');
const owner = JSON.parse(readFileSync(ownerPath, 'utf8')) as { wallet?: string };
// The owner wallet is a Solana address (base58, 32-44 characters) or, for an account that
// links an EVM wallet, a 0x hex address. The first version of this check tested only for the
// 0x form, which a Solana wallet fails by accident of operator precedence, so it passed the
// real wallet only because its length happened to be over 32. Test both forms properly.
const isSolanaAddress = (value: string): boolean =>
  /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
const isEvmAddress = (value: string): boolean => /^0x[0-9a-fA-F]{40}$/.test(value);
if (typeof owner.wallet !== 'string' || (!isSolanaAddress(owner.wallet) && !isEvmAddress(owner.wallet))) {
  fail('.makefun/owner.json does not name a wallet address');
}

const appTree = countTree(join(out, 'app'));
if (appTree.files + appTree.dirs > 993) fail(`app/ has ${appTree.files + appTree.dirs} files and directories, over the 993 cap`);
if (appTree.bytes > 16777216) fail(`app/ is ${appTree.bytes} bytes, over the 16 MiB cap`);

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_OPTIONS));

const dossier = JSON.parse(readFileSync(join(out, 'dossier.json'), 'utf8')) as { text?: string };
console.log(
  `handed in ${appTree.files} app files (${appTree.bytes} bytes), ${shots.length} screenshots, ` +
    `dossier text ${String(dossier.text ?? '').length} bytes -> ${out}`,
);
