#!/usr/bin/env node

import { put } from '@vercel/blob';
import { execSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeMessage } from './lib/sanitize.js';

export { sanitizeMessage };

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']);

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;

const toPosix = (p) => (sep === '/' ? p : p.split(sep).join('/'));

export const isImageFile = (filename) => IMAGE_EXTS.has(extname(filename).toLowerCase());

export const getContentType = (filename) =>
  CONTENT_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream';

export const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

export const findAssetFiles = async (assetsDir) => {
  const files = [];
  const visit = async (dir) => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(abs);
        continue;
      }
      if (!isImageFile(entry.name)) continue;
      const info = await stat(abs);
      files.push({
        localPath: abs,
        blobPath: toPosix(relative(assetsDir, abs)),
        size: info.size,
      });
    }
  };
  await visit(assetsDir);
  return files;
};

const runGit = (cmd, rootDir) =>
  execSync(cmd, {
    encoding: 'utf8',
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
    .trim()
    .split('\n')
    .filter(Boolean);

export const getChangedAssets = (rootDir) => {
  try {
    execSync('git rev-parse --git-dir', { cwd: rootDir, stdio: 'ignore' });
  } catch {
    return null;
  }

  const untracked = runGit('git ls-files --others --exclude-standard assets/', rootDir);
  const modified = runGit('git diff --name-only HEAD assets/', rootDir);
  const staged = runGit('git diff --staged --name-only assets/', rootDir);

  return [...new Set([...untracked, ...modified, ...staged])].filter(isImageFile);
};

export const uploadFile = async (file, { token, prefix = 'content' }) => {
  const buffer = await readFile(file.localPath);
  const blob = await put(`${prefix}/${file.blobPath}`, buffer, {
    access: 'public',
    contentType: getContentType(file.blobPath),
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
  });
  return { ...file, url: blob.url };
};

const VALID_TARGETS = new Set(['legacy', 'new']);

export const parseArgs = (argv) => {
  const args = argv.slice(2);
  let help = false;
  let all = false;
  let force = false;
  let noVerify = false;
  let target = 'legacy';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--help':
      case '-h':
        help = true;
        break;
      case '--all':
      case '-a':
        all = true;
        break;
      case '--force':
        force = true;
        break;
      case '--no-verify':
        noVerify = true;
        break;
      case '--target': {
        const raw = args[++i];
        if (!VALID_TARGETS.has(raw)) {
          throw new Error(`Invalid --target value: ${raw} (expected 'legacy' or 'new')`);
        }
        target = raw;
        break;
      }
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { help, all, force, noVerify, target };
};

export const resolveToken = (target, env = process.env) => {
  if (target === 'new') {
    return env.NEW_BLOB_READ_WRITE_TOKEN ?? null;
  }
  return env.BLOB_READ_WRITE_TOKEN ?? env.VERCEL_BLOB_READ_WRITE_TOKEN ?? null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const verifyUrls = async (
  uploaded,
  { fetchFn = globalThis.fetch, retries = 2, retryDelayMs = 500 } = {},
) => {
  const failures = [];

  const verifyOne = async (item) => {
    let last = { item, status: 0, ok: false };
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetchFn(item.url, { method: 'HEAD', redirect: 'follow' });
        last = { item, status: res.status, ok: res.ok };
        if (last.ok) return last;
      } catch (err) {
        last = { item, status: 0, ok: false, error: err.message ?? String(err) };
      }
      if (attempt < retries) await sleep(retryDelayMs);
    }
    return last;
  };

  for (let i = 0; i < uploaded.length; i += BATCH_SIZE) {
    const batch = uploaded.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(verifyOne));
    for (const r of results) {
      if (!r.ok) {
        failures.push({
          url: r.item.url,
          blobPath: r.item.blobPath,
          status: r.status,
          error: r.error,
        });
      }
    }
  }
  return { failures };
};

export const run = async ({
  rootDir,
  argv,
  token,
  log = console.log,
  warn = console.warn,
  batchDelayMs = BATCH_DELAY_MS,
  fetchFn,
  retries,
  retryDelayMs,
}) => {
  const opts = parseArgs(argv);

  if (opts.help) {
    log(usage());
    return { uploaded: [], skipped: 'help' };
  }

  const effectiveToken = token ?? resolveToken(opts.target);
  if (!effectiveToken) {
    const envVar = opts.target === 'new' ? 'NEW_BLOB_READ_WRITE_TOKEN' : 'BLOB_READ_WRITE_TOKEN';
    throw new Error(`Missing blob token. Set ${envVar} in your environment.`);
  }

  log(`Target: ${opts.target} store`);

  const assetsDir = join(rootDir, 'assets');
  try {
    await stat(assetsDir);
  } catch {
    warn(`No assets directory found at ${assetsDir}.`);
    return { uploaded: [], skipped: 'no-assets-dir' };
  }

  let filterList = null;
  if (!opts.all) {
    const changed = getChangedAssets(rootDir);
    if (changed === null) {
      warn('Not in a git repository — falling back to --all behaviour.');
    } else if (changed.length === 0 && !opts.force) {
      log('No changed assets. Use --all or --force to upload anyway.');
      return { uploaded: [], skipped: 'no-changes' };
    } else {
      filterList = new Set(changed);
    }
  }

  const allFiles = await findAssetFiles(assetsDir);
  const files = filterList
    ? allFiles.filter((f) => filterList.has(toPosix(relative(rootDir, f.localPath))))
    : allFiles;

  if (files.length === 0) {
    log('Nothing to upload.');
    return { uploaded: [], skipped: 'no-matches' };
  }

  const totalSize = files.reduce((s, f) => s + f.size, 0);
  log(`Uploading ${files.length} file(s) (${formatBytes(totalSize)})`);

  const uploaded = [];
  const uploadFailures = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((f) => uploadFile(f, { token: effectiveToken })),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.status === 'fulfilled') {
        uploaded.push(r.value);
        log(`  ${r.value.blobPath} → ${r.value.url}`);
      } else {
        const reason = sanitizeMessage(r.reason?.message ?? r.reason);
        uploadFailures.push({ blobPath: batch[j].blobPath, error: reason });
        warn(`  ✗ ${batch[j].blobPath} — ${reason}`);
      }
    }
    if (i + BATCH_SIZE < files.length && batchDelayMs > 0) {
      await sleep(batchDelayMs);
    }
  }

  if (uploadFailures.length > 0) {
    throw new Error(
      `Upload failed: ${uploadFailures.length}/${files.length} file(s) errored, ${uploaded.length} succeeded. Re-running is safe (idempotent).`,
    );
  }

  if (opts.noVerify) {
    log(`Uploaded ${uploaded.length} file(s). Verification skipped (--no-verify).`);
    return { uploaded, verified: null, skipped: null };
  }

  log(`Verifying ${uploaded.length} uploaded URL(s) via HEAD...`);
  const verifyOpts = {};
  if (fetchFn) verifyOpts.fetchFn = fetchFn;
  if (retries !== undefined) verifyOpts.retries = retries;
  if (retryDelayMs !== undefined) verifyOpts.retryDelayMs = retryDelayMs;
  const { failures } = await verifyUrls(uploaded, verifyOpts);
  if (failures.length > 0) {
    for (const f of failures) {
      const detail = f.error ? ` (${sanitizeMessage(f.error)})` : '';
      warn(`  ✗ ${f.blobPath} → HTTP ${f.status}${detail}`);
    }
    throw new Error(`Verification failed: ${failures.length}/${uploaded.length} URL(s) unreachable.`);
  }
  log(`Verified ${uploaded.length}/${uploaded.length} URL(s).`);

  return { uploaded, verified: uploaded.length, skipped: null };
};

const usage = () =>
  `
Usage:
  pnpm upload-assets             upload only changed/new assets (default)
  pnpm upload-assets:all         upload every asset (ignore git diff)
  pnpm upload-assets:migrate     upload every asset to the new store (--all --target new)

Flags:
  --all, -a            upload all assets, skip git diff filter
  --force              upload even if no changes detected
  --target <which>     'legacy' (default) or 'new' — selects which blob store to push to
  --no-verify          skip the post-upload HEAD verification step
  --help, -h           show this help

Environment:
  BLOB_READ_WRITE_TOKEN          read-write token for the legacy blob store (default target)
  NEW_BLOB_READ_WRITE_TOKEN      read-write token for the new blob store (--target new)
`.trim();

const isMainModule = () => {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === entry;
};

if (isMainModule()) {
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    await run({ rootDir, argv: process.argv });
  } catch (err) {
    console.error(`Upload failed: ${sanitizeMessage(err.message ?? err)}`);
    process.exit(1);
  }
}
