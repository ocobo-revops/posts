#!/usr/bin/env node

/**
 * Delete orphan assets listed in scripts/audit-orphans.json.
 *
 * Usage:
 *   node scripts/delete-orphan-assets.js            # dry-run (default)
 *   node scripts/delete-orphan-assets.js --confirm  # actually delete
 */

import { readFile, unlink, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const assetsDir = join(rootDir, 'assets');
const orphansFile = join(__dirname, 'audit-orphans.json');

const confirm = process.argv.includes('--confirm');

const main = async () => {
  const raw = await readFile(orphansFile, 'utf8');
  const orphans = JSON.parse(raw);

  if (!Array.isArray(orphans)) {
    throw new Error(`Expected an array in ${orphansFile}`);
  }

  console.log(
    `${confirm ? 'Deleting' : 'Dry-run'} ${orphans.length} orphan(s) from ${assetsDir}`,
  );
  console.log('');

  const deleted = [];
  const missing = [];
  const errors = [];

  for (const rel of orphans) {
    const abs = join(assetsDir, rel);
    try {
      await stat(abs);
    } catch {
      missing.push(rel);
      console.log(`  skip (not found): ${rel}`);
      continue;
    }

    if (!confirm) {
      console.log(`  would delete: ${rel}`);
      continue;
    }

    try {
      await unlink(abs);
      deleted.push(rel);
      console.log(`  deleted: ${rel}`);
    } catch (err) {
      errors.push({ rel, message: err.message });
      console.log(`  ERROR: ${rel} — ${err.message}`);
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  total listed:   ${orphans.length}`);
  if (confirm) {
    console.log(`  deleted:        ${deleted.length}`);
  } else {
    console.log(`  would delete:   ${orphans.length - missing.length}`);
  }
  console.log(`  missing on fs:  ${missing.length}`);
  console.log(`  errors:         ${errors.length}`);

  if (!confirm) {
    console.log('');
    console.log('Run with --confirm to execute deletions.');
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
