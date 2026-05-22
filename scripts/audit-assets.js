#!/usr/bin/env node

/**
 * Audit posts/assets/** against actual usage.
 *
 * Produces scripts/audit-orphans.json listing files present on disk but
 * not referenced by any of:
 *   - markdown frontmatter/body under posts/{blog,stories,team,jobs,tools,legal}
 *   - team-avatar slug convention (team/{slug}.{jpg,jpeg} per posts/team/{slug}.md)
 *   - ClientCarousel hardcoded slugs (website)
 *   - story-slug expansion (clients/{slug}-{white,avatar}.png)
 *   - any hardcoded asset path in website source (app/** under .tsx/.ts/.jsx/.js/.md/.mdx)
 *
 * Usage:
 *   node scripts/audit-assets.js
 *   node scripts/audit-assets.js --website-root <path>
 */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const assetsDir = join(rootDir, 'assets');
const outFile = join(__dirname, 'audit-orphans.json');

const MARKDOWN_ROOTS = ['blog', 'stories', 'team', 'jobs', 'tools', 'legal'];
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg']);

// Top-level directories under posts/assets/ — used to recognise asset paths
// in website source code (e.g. `${ASSETS_BASE_URL}/clients/foo.png`).
const ASSET_PREFIXES = ['clients', 'team', 'posts', 'stories', 'jobs', 'tools', 'legal'];

const WEBSITE_SOURCE_EXTS = new Set([
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.md',
  '.mdx',
]);
const WEBSITE_SCAN_SKIP = new Set([
  'node_modules',
  'build',
  'dist',
  'tmp',
  '.next',
  '.turbo',
  '.react-router',
  '.git',
  'public',
]);

const args = process.argv.slice(2);
const websiteRootArg = args.indexOf('--website-root');
const websiteRoot =
  websiteRootArg !== -1 && args[websiteRootArg + 1]
    ? args[websiteRootArg + 1]
    : join(rootDir, '..', 'website');

const carouselPath = join(
  websiteRoot,
  'app',
  'components',
  'ClientCarousel.tsx',
);

async function walk(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (entry.isFile()) {
      out.push(relative(base, full));
    }
  }
  return out;
}

function normaliseSep(p) {
  return p.split('\\').join('/');
}

function isImage(file) {
  return IMAGE_EXTS.has(extname(file).toLowerCase());
}

async function collectMarkdownRefs() {
  const used = new Set();
  const pattern =
    /(?:\/content\/|\/assets\/|(?<=["'(\s])(?:posts|content|assets)\/)([A-Za-z0-9_\-./]+\.(?:png|jpe?g|webp|gif|svg))/gi;
  for (const root of MARKDOWN_ROOTS) {
    const full = join(rootDir, root);
    if (!existsSync(full)) continue;
    const files = (await walk(full)).filter((f) => f.endsWith('.md'));
    for (const rel of files) {
      const text = await readFile(join(full, rel), 'utf8');
      for (const m of text.matchAll(pattern)) {
        used.add(normaliseSep(m[1]));
      }
    }
  }
  return used;
}

async function collectTeamAvatars() {
  const used = new Set();
  const teamDir = join(rootDir, 'team');
  if (!existsSync(teamDir)) return used;
  const files = await readdir(teamDir);
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const slug = basename(f, '.md');
    used.add(`team/${slug}.jpg`);
    used.add(`team/${slug}.jpeg`);
  }
  return used;
}

async function collectCarouselSlugs() {
  if (!existsSync(carouselPath)) {
    console.warn(
      `⚠️  ClientCarousel not found at ${carouselPath} — skipping carousel slugs. Pass --website-root <path> to override.`,
    );
    return [];
  }
  const text = await readFile(carouselPath, 'utf8');
  const slugs = new Set();
  for (const m of text.matchAll(/clients\/([a-z0-9-]+)-white\.png/gi)) {
    slugs.add(m[1]);
  }
  return [...slugs];
}

async function walkWebsiteSource(dir, base = dir) {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return out;
    throw err;
  }
  for (const entry of entries) {
    if (WEBSITE_SCAN_SKIP.has(entry.name)) continue;
    if (entry.name.startsWith('.') && entry.name !== '.') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkWebsiteSource(full, base)));
    } else if (entry.isFile() && WEBSITE_SOURCE_EXTS.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

async function collectWebsiteSourceRefs() {
  if (!existsSync(websiteRoot)) return new Set();
  const used = new Set();
  const prefixGroup = ASSET_PREFIXES.join('|');
  const pattern = new RegExp(
    `(?:\\/content\\/|\\$\\{ASSETS_BASE_URL\\}\\/|(?<=["'\`\\s/(])(?:${prefixGroup})\\/)([A-Za-z0-9_./-]+\\.(?:png|jpe?g|webp|gif|svg))`,
    'gi',
  );
  const files = await walkWebsiteSource(websiteRoot);
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const m of text.matchAll(pattern)) {
      const path = normaliseSep(m[1]);
      const top = path.split('/')[0];
      if (ASSET_PREFIXES.includes(top)) {
        used.add(path);
      } else {
        // Path captured after `/content/` or `${ASSETS_BASE_URL}/` lacks
        // a recognised prefix — keep it anyway, it may still match a file
        // under posts/assets/.
        used.add(path);
      }
    }
  }
  return used;
}

async function collectStorySlugs() {
  const dir = join(rootDir, 'stories', 'fr');
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  return files.filter((f) => f.endsWith('.md')).map((f) => basename(f, '.md'));
}

function expandClientVariants(slugs, isStorySlug) {
  const used = new Set();
  for (const slug of slugs) {
    used.add(`clients/${slug}-white.png`);
    if (isStorySlug) {
      used.add(`clients/${slug}-avatar.png`);
    }
  }
  return used;
}

function summariseByDir(files) {
  const byDir = {};
  for (const f of files) {
    const top = f.split('/')[0] || '(root)';
    byDir[top] = (byDir[top] || 0) + 1;
  }
  return byDir;
}

async function main() {
  const fsFiles = (await walk(assetsDir)).map(normaliseSep).sort();

  const markdownRefs = await collectMarkdownRefs();
  const teamAvatars = await collectTeamAvatars();
  const carouselSlugs = await collectCarouselSlugs();
  const storySlugs = await collectStorySlugs();
  const carouselUsed = expandClientVariants(carouselSlugs, false);
  const storyUsed = expandClientVariants(storySlugs, true);
  const websiteSourceRefs = await collectWebsiteSourceRefs();

  const used = new Set([
    ...markdownRefs,
    ...teamAvatars,
    ...carouselUsed,
    ...storyUsed,
    ...websiteSourceRefs,
  ]);

  const orphans = fsFiles.filter((f) => {
    if (!isImage(f) && basename(f) !== '.DS_Store') return false;
    if (basename(f) === '.DS_Store') return true;
    return !used.has(f);
  });

  await writeFile(outFile, `${JSON.stringify(orphans, null, 2)}\n`, 'utf8');

  console.log(`📊 Asset audit summary`);
  console.log(`  Total files on disk:    ${fsFiles.length}`);
  console.log(`  Referenced (used):      ${fsFiles.length - orphans.length}`);
  console.log(`  Orphan candidates:      ${orphans.length}`);
  console.log(`  Output:                 ${relative(rootDir, outFile)}`);

  const orphanByDir = summariseByDir(orphans);
  if (orphans.length > 0) {
    console.log(`\n📁 Orphans by sub-directory:`);
    for (const [dir, count] of Object.entries(orphanByDir).sort()) {
      console.log(`  ${dir.padEnd(20)} ${count}`);
    }
    console.log(`\n📝 Orphan list:`);
    for (const f of orphans) console.log(`  ${f}`);
  }
}

main().catch((err) => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
