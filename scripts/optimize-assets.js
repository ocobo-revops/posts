#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { getChangedAssets } from './upload-assets.js';

const JPEG_QUALITY = 80;
const WEBP_QUALITY = 80;
const DEFAULT_THRESHOLD_KB = 400;

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const toPosix = (p) => (sep === '/' ? p : p.split(sep).join('/'));

const walkAssets = async (rootDir) => {
  const assetsDir = join(rootDir, 'assets');
  const out = [];
  const visit = async (dir) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(abs);
        continue;
      }
      if (!ALLOWED_EXTS.has(extname(entry.name).toLowerCase())) continue;
      out.push(toPosix(relative(rootDir, abs)));
    }
  };
  await visit(assetsDir);
  return out;
};

const fileExists = async (abs) => {
  try {
    const info = await stat(abs);
    return info.isFile();
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
};

export const resolvePaths = async ({ rootDir, paths }) => {
  if (!paths) {
    const files = await walkAssets(rootDir);
    return { files, errors: [], warnings: [] };
  }

  const files = [];
  const errors = [];
  const warnings = [];

  const absRoot = resolve(rootDir);
  const absAssets = resolve(absRoot, 'assets');

  for (const raw of paths) {
    const rel = toPosix(raw);
    if (isAbsolute(raw)) {
      errors.push(`Path "${rel}" must be repo-relative, not absolute — refusing to process.`);
      continue;
    }
    const absTarget = resolve(absRoot, rel);
    const fromAssets = relative(absAssets, absTarget);
    if (fromAssets === '' || fromAssets.startsWith('..') || isAbsolute(fromAssets)) {
      errors.push(`Path "${rel}" escapes assets/ — refusing to process.`);
      continue;
    }
    if (!ALLOWED_EXTS.has(extname(rel).toLowerCase())) continue;
    if (!(await fileExists(absTarget))) {
      warnings.push(`Path "${rel}" not found on disk — skipping.`);
      continue;
    }
    files.push(toPosix(relative(absRoot, absTarget)));
  }

  return { files, errors, warnings };
};

// Scope the optimizer to the branch's new/changed assets, reusing upload-assets'
// git detection. getChangedAssets includes formats this optimizer cannot encode
// (.svg, .gif), so re-filter to ALLOWED_EXTS. Returns a warning (and no paths)
// outside a git repo — never falls back to walking all assets, which under --write
// would re-encode already-committed files.
export const resolveChangedPaths = (rootDir) => {
  const changed = getChangedAssets(rootDir);
  if (changed === null) {
    return { paths: [], warning: 'Not in a git repository — no changed assets to optimise.' };
  }
  const paths = changed.filter((p) => ALLOWED_EXTS.has(extname(p).toLowerCase()));
  return { paths, warning: null };
};

const DIR_LIMITS = [
  ['assets/team/', 800],
  ['assets/clients/', 400],
  ['assets/posts/', 1600],
  ['assets/stories/', 1600],
];

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatPercent = (before, after) => {
  if (before === 0) return '0%';
  return `${(((before - after) / before) * 100).toFixed(1)}%`;
};

const topLevelDir = (relPath) => relPath.split('/')[1] ?? '';

const skipLabel = (skipped) => {
  if (skipped === 'no-gain') return 'skip (no gain)';
  if (skipped === 'under-threshold') return 'skip (under threshold)';
  return null;
};

export const formatReport = (results) => {
  const lines = [];

  for (const r of results) {
    const reason = skipLabel(r.skipped);
    if (reason) {
      lines.push(`  ${r.path.padEnd(48)}  ${reason}`);
      continue;
    }
    lines.push(
      `  ${r.path.padEnd(48)}  ${formatBytes(r.before).padStart(10)} → ${formatBytes(r.after).padStart(10)}  (saved ${formatPercent(r.before, r.after)})`,
    );
  }

  const byExt = new Map();
  const byDir = new Map();
  let totalBefore = 0;
  let totalAfter = 0;

  for (const r of results) {
    totalBefore += r.before;
    totalAfter += r.after;
    const ext = extname(r.path).toLowerCase();
    const dir = topLevelDir(r.path);
    const e = byExt.get(ext) ?? { before: 0, after: 0, count: 0 };
    e.before += r.before;
    e.after += r.after;
    e.count += 1;
    byExt.set(ext, e);
    const d = byDir.get(dir) ?? { before: 0, after: 0, count: 0 };
    d.before += r.before;
    d.after += r.after;
    d.count += 1;
    byDir.set(dir, d);
  }

  lines.push('');
  lines.push('By extension:');
  for (const [ext, stats] of [...byExt.entries()].sort()) {
    lines.push(
      `  ${ext.padEnd(8)} ${String(stats.count).padStart(4)} files  ${formatBytes(stats.before).padStart(10)} → ${formatBytes(stats.after).padStart(10)}  (saved ${formatPercent(stats.before, stats.after)})`,
    );
  }

  lines.push('');
  lines.push('By directory:');
  for (const [dir, stats] of [...byDir.entries()].sort()) {
    lines.push(
      `  ${dir.padEnd(12)} ${String(stats.count).padStart(4)} files  ${formatBytes(stats.before).padStart(10)} → ${formatBytes(stats.after).padStart(10)}  (saved ${formatPercent(stats.before, stats.after)})`,
    );
  }

  lines.push('');
  lines.push(`Total before: ${formatBytes(totalBefore)}`);
  lines.push(`Total after:  ${formatBytes(totalAfter)}`);
  lines.push(
    `Total saved:  ${formatBytes(totalBefore - totalAfter)} (${formatPercent(totalBefore, totalAfter)})`,
  );

  return lines.join('\n');
};

export const writeAtomic = async (target, buffer) => {
  const tmp = `${target}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
  try {
    await writeFile(tmp, buffer);
    await rename(tmp, target);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
};

const resizeFit = (pipeline, maxDim) =>
  pipeline.resize({
    width: maxDim,
    height: maxDim,
    fit: 'inside',
    withoutEnlargement: true,
  });

export const optimizeBuffer = async (input, ext, { maxDim }) => {
  const normalised = ext.toLowerCase();
  const base = sharp(input).rotate();

  if (normalised === '.jpg' || normalised === '.jpeg') {
    const buffer = await resizeFit(base, maxDim)
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return { buffer, skipped: false };
  }

  if (normalised === '.webp') {
    const buffer = await resizeFit(base, maxDim)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { buffer, skipped: false };
  }

  if (normalised === '.png') {
    const buffer = await resizeFit(base, maxDim)
      .png({ compressionLevel: 9, palette: true, quality: 80 })
      .toBuffer();
    if (buffer.length >= input.length) {
      return { buffer: input, skipped: 'no-gain' };
    }
    return { buffer, skipped: false };
  }

  throw new Error(`Unsupported extension: ${ext}`);
};

export const getDirConfig = (relPath) => {
  const match = DIR_LIMITS.find(([prefix]) => relPath.startsWith(prefix));
  return { maxDim: match ? match[1] : 1600 };
};

export const run = async ({ rootDir, write = false, paths, thresholdKb = DEFAULT_THRESHOLD_KB }) => {
  const { files, errors, warnings } = await resolvePaths({ rootDir, paths });

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  const thresholdBytes = thresholdKb * 1024;
  const results = [];

  for (const rel of files) {
    const abs = join(rootDir, rel);
    const info = await stat(abs);
    const before = info.size;
    const ext = extname(rel).toLowerCase();
    const config = getDirConfig(rel);

    if (ext === '.png' && before <= thresholdBytes) {
      results.push({ path: rel, before, after: before, skipped: 'under-threshold' });
      continue;
    }

    const input = await readFile(abs);
    const { buffer, skipped } = await optimizeBuffer(input, ext, config);

    if (skipped) {
      results.push({ path: rel, before, after: before, skipped });
      continue;
    }

    if (write) {
      await writeAtomic(abs, buffer);
    }

    results.push({ path: rel, before, after: buffer.length, skipped: false });
  }

  return { results, warnings };
};

export const parseArgs = (argv) => {
  const args = argv.slice(2);
  const write = args.includes('--write');
  const changed = args.includes('--changed');

  const thresholdIdx = args.indexOf('--threshold-kb');
  let thresholdKb = DEFAULT_THRESHOLD_KB;
  if (thresholdIdx !== -1) {
    const raw = args[thresholdIdx + 1];
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`Invalid --threshold-kb value: ${raw}`);
    }
    thresholdKb = parsed;
  }

  const pathsIdx = args.indexOf('--paths');
  let paths;
  if (pathsIdx !== -1) {
    const raw = args[pathsIdx + 1];
    if (!raw) throw new Error('--paths requires a comma-separated list of paths');
    paths = raw.split(',').map((p) => p.trim()).filter(Boolean);
  }

  return { write, changed, thresholdKb, paths };
};

const isMainModule = () => {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === entry;
};

if (isMainModule()) {
  const { write, changed, thresholdKb, paths: explicitPaths } = parseArgs(process.argv);
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

  // --changed scopes to the branch's new/changed assets (publish flow). Explicit
  // --paths wins if both are given; bare invocation still walks assets/**.
  let paths = explicitPaths;
  let changedWarning;
  if (changed && !explicitPaths) {
    const resolved = resolveChangedPaths(rootDir);
    paths = resolved.paths;
    changedWarning = resolved.warning;
  }

  const scopeLabel = paths
    ? `, ${paths.length} ${changed && !explicitPaths ? 'changed' : 'explicit'} path(s)`
    : ', walking assets/**';
  console.log(`${write ? '✍️  Writing' : '🔍 Dry-run'} — threshold ${thresholdKb} KB${scopeLabel}`);
  console.log('');

  try {
    if (changedWarning) console.warn(`⚠️  ${changedWarning}`);

    if (paths && paths.length === 0) {
      console.log('No changed assets to optimise.');
    } else {
      const { results, warnings } = await run({ rootDir, write, paths, thresholdKb });

      for (const w of warnings) {
        console.warn(`⚠️  ${w}`);
      }

      console.log(formatReport(results));

      if (!write) {
        console.log('');
        console.log('Run with --write to overwrite originals in place.');
      }
    }
  } catch (err) {
    console.error('❌ Optimisation failed:', err.message ?? err);
    process.exit(1);
  }
}
