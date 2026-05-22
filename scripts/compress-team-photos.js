#!/usr/bin/env node

/**
 * Compress oversized team photos under assets/team/.
 *
 * For each JPEG above the threshold (default 400 KB):
 *   - resize to fit within 800x800 (preserve aspect ratio, no upscale)
 *   - re-encode as JPEG quality 80
 *   - preserve original filename + extension
 *
 * Dry-run by default — encodes to a Buffer in memory to project savings
 * without touching the disk. Pass --write to overwrite originals in place.
 *
 * Usage:
 *   node scripts/compress-team-photos.js                       # dry-run
 *   node scripts/compress-team-photos.js --threshold-kb 500    # custom threshold
 *   node scripts/compress-team-photos.js --write               # overwrite originals
 */

import { readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const teamDir = join(rootDir, 'assets', 'team');

const JPEG_EXTS = new Set(['.jpg', '.jpeg']);
const MAX_DIMENSION = 800;
const JPEG_QUALITY = 80;
const DEFAULT_THRESHOLD_KB = 400;

const parseArgs = (argv) => {
  const args = argv.slice(2);
  const write = args.includes('--write');
  const thresholdIdx = args.indexOf('--threshold-kb');
  const thresholdKb =
    thresholdIdx !== -1 && args[thresholdIdx + 1]
      ? Number(args[thresholdIdx + 1])
      : DEFAULT_THRESHOLD_KB;
  if (!Number.isFinite(thresholdKb) || thresholdKb <= 0) {
    throw new Error(`Invalid --threshold-kb value: ${args[thresholdIdx + 1]}`);
  }
  return { write, thresholdBytes: thresholdKb * 1024, thresholdKb };
};

const isJpeg = (file) => JPEG_EXTS.has(extname(file).toLowerCase());

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatPercent = (before, after) => {
  if (before === 0) return '0%';
  const saved = ((before - after) / before) * 100;
  return `${saved.toFixed(1)}%`;
};

const compressBuffer = async (absPath) => {
  const input = await readFile(absPath);
  const output = await sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
  return output;
};

const main = async () => {
  const { write, thresholdBytes, thresholdKb } = parseArgs(process.argv);

  let entries;
  try {
    entries = await readdir(teamDir);
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`❌ Team directory not found: ${teamDir}`);
      process.exit(1);
    }
    throw err;
  }

  const jpegs = entries.filter(isJpeg).sort();

  console.log(
    `${write ? '✍️  Writing' : '🔍 Dry-run'} — threshold ${thresholdKb} KB, ${jpegs.length} JPEG(s) in assets/team/`,
  );
  console.log('');

  let totalBefore = 0;
  let totalAfter = 0;
  let compressedCount = 0;
  let skippedCount = 0;

  for (const file of jpegs) {
    const abs = join(teamDir, file);
    const info = await stat(abs);
    const before = info.size;

    if (before <= thresholdBytes) {
      skippedCount += 1;
      continue;
    }

    const buffer = await compressBuffer(abs);
    const after = buffer.length;
    totalBefore += before;
    totalAfter += after;
    compressedCount += 1;

    console.log(
      `  ${file.padEnd(30)} ${formatBytes(before).padStart(10)} → ${formatBytes(after).padStart(10)}  (saved ${formatPercent(before, after)})`,
    );

    if (write) {
      const tmp = `${abs}.tmp-${process.pid}`;
      try {
        await writeFile(tmp, buffer);
        await rename(tmp, abs);
      } catch (err) {
        await unlink(tmp).catch(() => {});
        throw err;
      }
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  candidates compressed: ${compressedCount}`);
  console.log(`  skipped (under threshold): ${skippedCount}`);
  console.log(`  total before: ${formatBytes(totalBefore)}`);
  console.log(`  total after:  ${formatBytes(totalAfter)}`);
  console.log(
    `  total saved:  ${formatBytes(totalBefore - totalAfter)} (${formatPercent(totalBefore, totalAfter)})`,
  );

  if (!write) {
    console.log('');
    console.log('Run with --write to overwrite originals in place.');
  }
};

main().catch((err) => {
  console.error('❌ Compression failed:', err);
  process.exit(1);
});
