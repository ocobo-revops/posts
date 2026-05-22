#!/usr/bin/env node

import { put } from '@vercel/blob';
import { execSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

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

export const parseArgs = (argv) => {
  const args = argv.slice(2);
  return {
    help: args.includes('--help') || args.includes('-h'),
    all: args.includes('--all') || args.includes('-a'),
    force: args.includes('--force'),
  };
};

const resolveToken = () =>
  process.env.BLOB_READ_WRITE_TOKEN ?? process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const run = async ({
  rootDir,
  argv,
  token,
  log = console.log,
  warn = console.warn,
  batchDelayMs = BATCH_DELAY_MS,
}) => {
  const opts = parseArgs(argv);

  if (opts.help) {
    log(usage());
    return { uploaded: [], skipped: 'help' };
  }

  if (!token) {
    throw new Error('Missing blob token. Set BLOB_READ_WRITE_TOKEN in your environment.');
  }

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
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map((f) => uploadFile(f, { token })));
    uploaded.push(...results);
    for (const r of results) {
      log(`  ${r.blobPath} → ${r.url}`);
    }
    if (i + BATCH_SIZE < files.length && batchDelayMs > 0) {
      await sleep(batchDelayMs);
    }
  }

  return { uploaded, skipped: null };
};

const usage = () =>
  `
Usage:
  pnpm upload-assets             upload only changed/new assets (default)
  pnpm upload-assets:all         upload every asset (ignore git diff)

Flags:
  --all, -a       upload all assets, skip git diff filter
  --force         upload even if no changes detected
  --help, -h      show this help

Environment:
  BLOB_READ_WRITE_TOKEN          read-write token for the target blob store
`.trim();

const isMainModule = () => {
  const entry = process.argv[1];
  if (!entry) return false;
  return fileURLToPath(import.meta.url) === entry;
};

if (isMainModule()) {
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  try {
    await run({ rootDir, argv: process.argv, token: resolveToken() });
  } catch (err) {
    console.error(`Upload failed: ${err.message ?? err}`);
    process.exit(1);
  }
}
