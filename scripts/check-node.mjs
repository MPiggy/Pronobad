// Fails fast, and with an actionable message, when the running Node is too old.
//
// Without this, an old Node dies deep inside Prisma's bundled CommonJS with an
// opaque ERR_REQUIRE_ESM and a screenful of minified source. `engine-strict` in
// .npmrc only covers `npm install`; it does nothing for `npm run`, which is
// where this actually bites.
//
// Reads the required range from `engines.node` so there is one source of truth.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { engines } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// engines.node is ">=22.12.0" — take the floor and compare numerically.
const required = engines.node.replace(/^\D+/, '');
const [reqMajor, reqMinor = 0, reqPatch = 0] = required.split('.').map(Number);
const [curMajor, curMinor, curPatch] = process.versions.node.split('.').map(Number);

const cmp =
  curMajor - reqMajor || curMinor - reqMinor || curPatch - reqPatch;

if (cmp < 0) {
  const pinned = readFileSync(join(root, '.nvmrc'), 'utf8').trim();

  process.stderr.write(
    `\n  Node ${process.versions.node} is too old — this project needs ${engines.node}.\n` +
      `  Running: ${process.execPath}\n\n` +
      `  Prisma 7 fails on older Node with an unreadable ERR_REQUIRE_ESM, so we\n` +
      `  stop here instead.\n\n` +
      `  Fix:  nvm use ${pinned}\n\n` +
      `  If \`nvm use\` says it worked but this message keeps appearing, a\n` +
      `  system-wide Node earlier in PATH is shadowing it. See the Node version\n` +
      `  section in README.md.\n\n`,
  );
  process.exit(1);
}
