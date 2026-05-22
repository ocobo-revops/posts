#!/usr/bin/env node

/**
 * Update asset URLs in markdown files to use Vercel Blob URLs.
 *
 * Usage:
 *   pnpm update-urls                      # rewrite local asset paths to the legacy store
 *   pnpm update-urls:new                  # rewrite legacy + local paths to the new store
 *   node scripts/update-asset-urls.js --target new
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

export const LEGACY_HOST = 'jr0deqtyc8c5pvr8.public.blob.vercel-storage.com';
export const NEW_HOST = 'ipjmp3k0z0p479cb.public.blob.vercel-storage.com';

export const CONTENT_DIRS = ['blog', 'stories', 'legal', 'team', 'tools'];

const VALID_TARGETS = new Set(['legacy', 'new']);
const IMAGE_EXTS_RE = '(png|jpg|jpeg|svg|webp|gif)';

export const resolveBaseUrl = (target) => {
  const host = target === 'new' ? NEW_HOST : LEGACY_HOST;
  return `https://${host}/content/`;
};

export const parseArgs = (argv) => {
  let help = false;
  let target = 'legacy';

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--help':
      case '-h':
        help = true;
        break;
      case '--target': {
        const raw = argv[++i];
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

  return { help, target };
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const updateMarkdownContent = (content, { target = 'legacy' } = {}) => {
  const baseUrl = resolveBaseUrl(target);
  let updatedContent = content;
  let replacements = 0;

  // Pattern 1: /assets/... -> blob URL
  const assetPattern = new RegExp(`/assets/([\\w\\-/.]+\\.${IMAGE_EXTS_RE})`, 'gi');
  updatedContent = updatedContent.replace(assetPattern, (_match, assetPath) => {
    replacements++;
    return `${baseUrl}${assetPath}`;
  });

  // Pattern 2: assets/... -> blob URL (relative paths)
  // Anchor on a non-word, non-slash boundary so we don't match
  // mid-word (e.g. 'word_assets/x.png') or after another path segment
  // (e.g. '/foo/assets/x.png' — Pattern 1 already handles those).
  const relativeAssetPattern = new RegExp(
    `(?<![\\w/\\-.])assets/([\\w\\-/.]+\\.${IMAGE_EXTS_RE})`,
    'gi',
  );
  updatedContent = updatedContent.replace(relativeAssetPattern, (_match, assetPath) => {
    replacements++;
    return `${baseUrl}${assetPath}`;
  });

  // Pattern 3: https://www.ocobo.co/assets/... -> blob URL
  const absoluteAssetPattern = new RegExp(
    `https://www\\.ocobo\\.co/assets/([\\w\\-/.]+\\.${IMAGE_EXTS_RE})`,
    'gi',
  );
  updatedContent = updatedContent.replace(absoluteAssetPattern, (_match, assetPath) => {
    replacements++;
    return `${baseUrl}${assetPath}`;
  });

  // Pattern 4: cleanup double-blob URLs (https://www.ocobo.co/https://blob.../...)
  const doubleBlobPattern = new RegExp(`https://www\\.ocobo\\.co${escapeRegex(baseUrl)}`, 'gi');
  updatedContent = updatedContent.replace(doubleBlobPattern, baseUrl);

  // Pattern 5: when migrating to 'new', rewrite legacy-host URLs → new-host URLs
  if (target === 'new') {
    const legacyHostPattern = new RegExp(escapeRegex(`https://${LEGACY_HOST}/`), 'gi');
    updatedContent = updatedContent.replace(legacyHostPattern, (match) => {
      replacements++;
      return `https://${NEW_HOST}/`;
    });
  }

  return { content: updatedContent, replacements };
};

const findMarkdownFiles = async (dirPath) => {
  const files = [];

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        const subFiles = await findMarkdownFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Could not read directory ${dirPath}:`, error.message);
    }
  }

  return files;
};

const updateFile = async (filePath, opts) => {
  try {
    const content = await readFile(filePath, 'utf-8');
    const { content: updatedContent, replacements } = updateMarkdownContent(content, opts);

    if (replacements === 0) {
      return { updated: false, replacements: 0 };
    }

    const relativePath = filePath.replace(rootDir, '').replace(/^\//, '');
    console.log(`📝 ${relativePath}: ${replacements} URL(s) updated`);

    await writeFile(filePath, updatedContent, 'utf-8');

    return { updated: true, replacements };
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
    return { updated: false, replacements: 0, error: error.message };
  }
};

const showUsage = () => {
  console.log(`
🔄 Ocobo Posts - Asset URL Update Tool

Update markdown files to use Vercel Blob URLs for assets.

Usage:
  pnpm update-urls                      Rewrite local asset paths to the legacy store
  pnpm update-urls:new                  Rewrite legacy + local paths to the new store
  node scripts/update-asset-urls.js [--target legacy|new]

Options:
  --target <which>     'legacy' (default) or 'new' — selects which blob host to write
  --help, -h           Show this help

Examples of updates:
  /assets/posts/my-post/image.png          → https://<host>/content/posts/my-post/image.png
  assets/clients/logo.png                  → https://<host>/content/clients/logo.png
  https://www.ocobo.co/assets/...          → https://<host>/content/...
  https://<legacy-host>/content/... (only with --target new)
                                           → https://<new-host>/content/...
`);
};

export const run = async (opts) => {
  console.log('🔄 Starting asset URL updates...\n');
  console.log(`Target: ${opts.target} store (${resolveBaseUrl(opts.target)})\n`);

  console.log('🔍 Finding markdown files...');
  const markdownFiles = [];

  for (const dir of CONTENT_DIRS) {
    const dirPath = join(rootDir, dir);
    const files = await findMarkdownFiles(dirPath);
    markdownFiles.push(...files);
  }

  console.log(`Found ${markdownFiles.length} markdown files\n`);

  if (markdownFiles.length === 0) {
    console.log('No markdown files found to process.');
    return;
  }

  let totalUpdated = 0;
  let totalReplacements = 0;
  const errors = [];

  for (const file of markdownFiles) {
    const result = await updateFile(file, opts);

    if (result.updated) {
      totalUpdated++;
    }

    totalReplacements += result.replacements;

    if (result.error) {
      errors.push({ file, error: result.error });
    }
  }

  console.log('\n✅ URL update completed!');
  console.log('\n📊 Summary:');
  console.log(`- Files processed: ${markdownFiles.length}`);
  console.log(`- Files updated: ${totalUpdated}`);
  console.log(`- Total URL replacements: ${totalReplacements}`);
  console.log(`- Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    for (const { file, error } of errors) {
      console.log(`  - ${file}: ${error}`);
    }
  }

  if (totalUpdated > 0) {
    console.log(`\n🎉 Asset URLs updated for target=${opts.target}!`);
  }
};

const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }

  if (opts.help) {
    showUsage();
    process.exit(0);
  }

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  run(opts).catch((error) => {
    console.error('\n❌ Update process failed:', error);
    process.exit(1);
  });
}
