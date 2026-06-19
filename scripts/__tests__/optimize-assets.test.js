import { execSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  formatReport,
  getDirConfig,
  optimizeBuffer,
  parseArgs,
  resolveChangedPaths,
  resolveChangedPathsAgainstBase,
  resolvePaths,
  resolveScope,
  run,
  writeAtomic,
} from '../optimize-assets.js';

const makeJpeg = (width, height) =>
  sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .jpeg({ quality: 100 })
    .toBuffer();

const makePng = (width, height) =>
  sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .png({ compressionLevel: 0 })
    .toBuffer();

const makeWebp = (width, height) =>
  sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .webp({ quality: 100 })
    .toBuffer();

describe('getDirConfig', () => {
  it('returns 800x800 for files under assets/team/', () => {
    expect(getDirConfig('assets/team/jane-doe.jpg')).toEqual({ maxDim: 800 });
  });

  it('returns 400x400 for files under assets/clients/', () => {
    expect(getDirConfig('assets/clients/acme-white.png')).toEqual({ maxDim: 400 });
  });

  it('returns 1600x1600 for files under assets/posts/<slug>/', () => {
    expect(getDirConfig('assets/posts/some-slug/cover.jpg')).toEqual({ maxDim: 1600 });
  });

  it('returns 1600x1600 for files under assets/stories/<slug>/', () => {
    expect(getDirConfig('assets/stories/some-slug/hero.png')).toEqual({ maxDim: 1600 });
  });

  it('falls back to 1600x1600 for other categories (jobs, tools, legal)', () => {
    expect(getDirConfig('assets/jobs/foo.jpg')).toEqual({ maxDim: 1600 });
    expect(getDirConfig('assets/tools/bar.png')).toEqual({ maxDim: 1600 });
    expect(getDirConfig('assets/legal/baz.webp')).toEqual({ maxDim: 1600 });
  });
});

describe('resolvePaths', () => {
  let rootDir;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'optimize-assets-'));
    await mkdir(join(rootDir, 'assets', 'team'), { recursive: true });
    await mkdir(join(rootDir, 'assets', 'posts', 'slug-a'), { recursive: true });
    await writeFile(join(rootDir, 'assets', 'team', 'jane.jpg'), 'jpg');
    await writeFile(join(rootDir, 'assets', 'team', 'note.txt'), 'txt');
    await writeFile(join(rootDir, 'assets', 'posts', 'slug-a', 'cover.png'), 'png');
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('walks assets/** by default and returns only allowlisted extensions', async () => {
    const result = await resolvePaths({ rootDir });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.files.sort()).toEqual([
      'assets/posts/slug-a/cover.png',
      'assets/team/jane.jpg',
    ]);
  });

  it('with --paths, restricts processing to the given repo-relative list', async () => {
    const result = await resolvePaths({
      rootDir,
      paths: ['assets/team/jane.jpg'],
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.files).toEqual(['assets/team/jane.jpg']);
  });

  it('silently filters --paths entries whose extension is not in the allowlist', async () => {
    const result = await resolvePaths({
      rootDir,
      paths: ['assets/team/jane.jpg', 'assets/team/note.txt'],
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.files).toEqual(['assets/team/jane.jpg']);
  });

  it('returns an error for --paths entries outside assets/', async () => {
    const result = await resolvePaths({
      rootDir,
      paths: ['scripts/optimize-assets.js'],
    });

    expect(result.files).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/scripts\/optimize-assets\.js/);
    expect(result.errors[0]).toMatch(/assets\//);
  });

  it('rejects --paths entries that traverse out of assets/ via ..-segments', async () => {
    const result = await resolvePaths({
      rootDir,
      paths: ['assets/../package.json', 'assets/team/../../secret.jpg'],
    });

    expect(result.files).toEqual([]);
    expect(result.errors).toHaveLength(2);
    for (const err of result.errors) {
      expect(err).toMatch(/escap|outside/i);
    }
  });

  it('rejects absolute paths even when they appear to point inside assets/', async () => {
    const result = await resolvePaths({
      rootDir,
      paths: [join(rootDir, 'assets', 'team', 'jane.jpg')],
    });

    expect(result.files).toEqual([]);
    expect(result.errors).toHaveLength(1);
  });

  it('returns a warning for --paths entries that do not exist on disk', async () => {
    const result = await resolvePaths({
      rootDir,
      paths: ['assets/team/jane.jpg', 'assets/team/missing.jpg'],
    });

    expect(result.errors).toEqual([]);
    expect(result.files).toEqual(['assets/team/jane.jpg']);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/missing\.jpg/);
  });
});

describe('resolveChangedPaths', () => {
  let rootDir;

  const git = (cmd) =>
    execSync(`git ${cmd}`, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] });

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'optimize-assets-changed-'));
    git('init -q');
    git('config user.email "test@example.com"');
    git('config user.name "Test"');
    git('commit --allow-empty -q -m "init"');
    await mkdir(join(rootDir, 'assets', 'posts'), { recursive: true });
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('returns only changed image paths, excluding non-images and unchanged files', async () => {
    await writeFile(join(rootDir, 'assets', 'posts', 'committed.png'), 'v1');
    git('add assets/posts/committed.png');
    git('commit -q -m "add committed"');

    await writeFile(join(rootDir, 'assets', 'posts', 'fresh.jpg'), 'jpg');
    await writeFile(join(rootDir, 'assets', 'posts', 'notes.md'), 'md');

    const result = resolveChangedPaths(rootDir);

    expect(result.paths).toContain('assets/posts/fresh.jpg');
    expect(result.paths).not.toContain('assets/posts/notes.md');
    expect(result.paths).not.toContain('assets/posts/committed.png');
    expect(result.warning).toBeNull();
  });

  it('excludes formats the optimizer cannot encode (.svg, .gif)', async () => {
    await writeFile(join(rootDir, 'assets', 'posts', 'logo.svg'), 'svg');
    await writeFile(join(rootDir, 'assets', 'posts', 'anim.gif'), 'gif');
    await writeFile(join(rootDir, 'assets', 'posts', 'photo.jpg'), 'jpg');

    const { paths } = resolveChangedPaths(rootDir);

    expect(paths).toEqual(['assets/posts/photo.jpg']);
  });

  it('returns no paths and a warning outside a git repository (no mass rewrite)', async () => {
    const nonRepo = await mkdtemp(join(tmpdir(), 'optimize-assets-nogit-'));
    try {
      const result = resolveChangedPaths(nonRepo);
      expect(result.paths).toEqual([]);
      expect(result.warning).toMatch(/git/i);
    } finally {
      await rm(nonRepo, { recursive: true, force: true });
    }
  });
});

describe('resolveChangedPathsAgainstBase', () => {
  let rootDir;

  const git = (cmd) =>
    execSync(`git ${cmd}`, { cwd: rootDir, stdio: ['ignore', 'pipe', 'ignore'] });

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'optimize-assets-base-'));
    git('init -q -b main');
    git('config user.email "test@example.com"');
    git('config user.name "Test"');
    git('commit --allow-empty -q -m "init"');
    await mkdir(join(rootDir, 'assets', 'posts'), { recursive: true });
    await writeFile(join(rootDir, 'assets', 'posts', 'base.png'), 'base');
    git('add -A');
    git('commit -q -m "base asset"');
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('returns image paths changed between base and HEAD (committed, not working tree)', async () => {
    git('checkout -q -b feature');
    await writeFile(join(rootDir, 'assets', 'posts', 'fresh.jpg'), 'jpg');
    await writeFile(join(rootDir, 'assets', 'posts', 'notes.md'), 'md');
    git('add -A');
    git('commit -q -m "add fresh"');

    const result = resolveChangedPathsAgainstBase(rootDir, 'main');

    expect(result.paths).toContain('assets/posts/fresh.jpg');
    expect(result.paths).not.toContain('assets/posts/notes.md');
    expect(result.paths).not.toContain('assets/posts/base.png');
    expect(result.warning).toBeNull();
  });

  it('returns no paths and a warning outside a git repository', async () => {
    const nonRepo = await mkdtemp(join(tmpdir(), 'optimize-assets-nogit-base-'));
    try {
      const result = resolveChangedPathsAgainstBase(nonRepo, 'main');
      expect(result.paths).toEqual([]);
      expect(result.warning).toMatch(/git/i);
    } finally {
      await rm(nonRepo, { recursive: true, force: true });
    }
  });
});

describe('resolveScope', () => {
  it('explicit --paths win over --changed (git is never consulted)', () => {
    // rootDir is a non-existent, non-git path: if --changed were honoured it
    // would surface the no-git warning. Explicit paths must short-circuit that.
    const { paths, warning } = resolveScope({
      changed: true,
      explicitPaths: ['assets/team/jane.jpg'],
      rootDir: '/nonexistent',
    });

    expect(paths).toEqual(['assets/team/jane.jpg']);
    expect(warning).toBeNull();
  });

  it('with neither flag, paths is undefined so run() walks all assets', () => {
    const { paths } = resolveScope({ changed: false, explicitPaths: undefined, rootDir: '/x' });
    expect(paths).toBeUndefined();
  });

  it('--base wins over --changed (CI mode scopes against the ref)', () => {
    const { paths, warning } = resolveScope({
      changed: true,
      explicitPaths: undefined,
      base: 'origin/main',
      rootDir: '/nonexistent',
    });
    // /nonexistent is not a git repo, so against-base detection yields the warning.
    expect(paths).toEqual([]);
    expect(warning).toMatch(/git/i);
  });

  it('explicit --paths win over --base', () => {
    const { paths, warning } = resolveScope({
      changed: false,
      explicitPaths: ['assets/team/jane.jpg'],
      base: 'origin/main',
      rootDir: '/nonexistent',
    });
    expect(paths).toEqual(['assets/team/jane.jpg']);
    expect(warning).toBeNull();
  });

  it('--changed outside a git repo yields no paths and a warning (no mass rewrite)', () => {
    const { paths, warning } = resolveScope({
      changed: true,
      explicitPaths: undefined,
      rootDir: '/nonexistent',
    });
    expect(paths).toEqual([]);
    expect(warning).toMatch(/git/i);
  });
});

describe('parseArgs', () => {
  const argv = (...flags) => ['node', 'optimize-assets.js', ...flags];

  it('defaults changed to false', () => {
    expect(parseArgs(argv()).changed).toBe(false);
  });

  it('sets changed when --changed is passed', () => {
    expect(parseArgs(argv('--changed', '--write')).changed).toBe(true);
  });

  it('parses --base <ref>', () => {
    expect(parseArgs(argv('--write', '--base', 'origin/main')).base).toBe('origin/main');
  });

  it('throws when --base has no ref', () => {
    expect(() => parseArgs(argv('--base'))).toThrow(/--base requires a git ref/);
    expect(() => parseArgs(argv('--base', '--write'))).toThrow(/--base requires a git ref/);
  });
});

describe('optimizeBuffer', () => {
  it('JPEG: resizes to fit maxDim and re-encodes smaller', async () => {
    const input = await makeJpeg(2000, 2000);
    const result = await optimizeBuffer(input, '.jpg', { maxDim: 800 });

    expect(result.skipped).toBe(false);
    expect(result.buffer.length).toBeLessThan(input.length);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(800);
    expect(meta.format).toBe('jpeg');
  });

  it('JPEG: respects withoutEnlargement (smaller than maxDim stays the same dimension)', async () => {
    const input = await makeJpeg(400, 400);
    const result = await optimizeBuffer(input, '.jpeg', { maxDim: 800 });

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(400);
  });

  it('PNG: returns skipped="no-gain" when re-encoded output is not smaller than input', async () => {
    const input = await sharp({
      create: { width: 50, height: 50, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png({ compressionLevel: 9, palette: true })
      .toBuffer();

    const result = await optimizeBuffer(input, '.png', { maxDim: 1600 });

    expect(result.skipped).toBe('no-gain');
    expect(result.buffer).toBe(input);
  });

  it('PNG: re-encodes when it produces a smaller buffer', async () => {
    const input = await makePng(800, 800);
    const result = await optimizeBuffer(input, '.png', { maxDim: 400 });

    expect(result.skipped).toBe(false);
    expect(result.buffer.length).toBeLessThan(input.length);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe('png');
  });

  it('WebP: re-encodes at quality 80', async () => {
    const input = await makeWebp(2000, 2000);
    const result = await optimizeBuffer(input, '.webp', { maxDim: 800 });

    expect(result.skipped).toBe(false);
    expect(result.buffer.length).toBeLessThan(input.length);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(800);
    expect(meta.format).toBe('webp');
  });
});

describe('writeAtomic', () => {
  let dir;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'optimize-assets-atomic-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes the buffer in place and leaves no .tmp residue', async () => {
    const target = join(dir, 'file.jpg');
    await writeFile(target, 'original');

    await writeAtomic(target, Buffer.from('rewritten'));

    const entries = await readdir(dir);
    expect(entries).toEqual(['file.jpg']);
  });

  it('cleans up the tmp file when rename fails', async () => {
    const target = join(dir, 'subdir', 'missing.jpg');

    await expect(writeAtomic(target, Buffer.from('x'))).rejects.toThrow();

    const entries = await readdir(dir);
    expect(entries).toEqual([]);
  });

  it('concurrent calls on the same target both succeed and leave no residue', async () => {
    const target = join(dir, 'same.jpg');
    await writeFile(target, 'original');

    const bufA = Buffer.alloc(200, 'A');
    const bufB = Buffer.alloc(200, 'B');

    await Promise.all([writeAtomic(target, bufA), writeAtomic(target, bufB)]);

    const entries = await readdir(dir);
    expect(entries.every((e) => !e.includes('.tmp-'))).toBe(true);

    const final = await readFile(target);
    expect([bufA.toString('hex'), bufB.toString('hex')]).toContain(final.toString('hex'));
  });
});

describe('formatReport', () => {
  const results = [
    { path: 'assets/team/jane.jpg', before: 1_500_000, after: 200_000, skipped: false },
    { path: 'assets/team/john.jpg', before: 1_200_000, after: 180_000, skipped: false },
    { path: 'assets/posts/foo/cover.png', before: 800_000, after: 800_000, skipped: 'no-gain' },
    { path: 'assets/posts/foo/inline.png', before: 500_000, after: 300_000, skipped: false },
    { path: 'assets/clients/acme.png', before: 50_000, after: 50_000, skipped: 'under-threshold' },
  ];

  it('lists per-file results: non-skipped rows show a size transition, skipped rows do not', () => {
    const lines = formatReport(results).split('\n');

    const lineFor = (path) => lines.find((l) => l.includes(path));

    // non-skipped → before → after notation present
    expect(lineFor('assets/team/jane.jpg')).toMatch(/→/);
    expect(lineFor('assets/posts/foo/inline.png')).toMatch(/→/);

    // skipped → no size transition (preserves the user-visible distinction
    // without coupling to the exact human-readable label)
    expect(lineFor('assets/posts/foo/cover.png')).not.toMatch(/→/);
    expect(lineFor('assets/clients/acme.png')).not.toMatch(/→/);
  });

  it('summarises totals by extension', () => {
    const report = formatReport(results);

    expect(report).toMatch(/By extension/);
    expect(report).toMatch(/\.jpg/);
    expect(report).toMatch(/\.png/);
  });

  it('summarises totals by top-level directory', () => {
    const report = formatReport(results);

    expect(report).toMatch(/By directory/);
    expect(report).toMatch(/team/);
    expect(report).toMatch(/posts/);
    expect(report).toMatch(/clients/);
  });

  it('reports the global total and overall percentage saved', () => {
    const report = formatReport(results);

    expect(report).toMatch(/total before/i);
    expect(report).toMatch(/total after/i);
    expect(report).toMatch(/total saved/i);
  });
});

describe('run (orchestrator)', () => {
  let rootDir;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'optimize-assets-run-'));
    await mkdir(join(rootDir, 'assets', 'team'), { recursive: true });
    await mkdir(join(rootDir, 'assets', 'posts', 'a'), { recursive: true });
    await mkdir(join(rootDir, 'assets', 'clients'), { recursive: true });

    await writeFile(join(rootDir, 'assets', 'team', 'oversized.jpg'), await makeJpeg(2000, 2000));
    await writeFile(join(rootDir, 'assets', 'posts', 'a', 'cover.jpg'), await makeJpeg(3000, 3000));
    await writeFile(join(rootDir, 'assets', 'clients', 'tiny.png'), await makePng(40, 40));
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('dry-run leaves the filesystem untouched', async () => {
    const before = await readFile(join(rootDir, 'assets', 'team', 'oversized.jpg'));

    const result = await run({ rootDir, write: false });

    const after = await readFile(join(rootDir, 'assets', 'team', 'oversized.jpg'));
    expect(after.equals(before)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('--write rewrites files in place and leaves no .tmp residue', async () => {
    const originalSize = (await readFile(join(rootDir, 'assets', 'team', 'oversized.jpg'))).length;

    await run({ rootDir, write: true });

    const newSize = (await readFile(join(rootDir, 'assets', 'team', 'oversized.jpg'))).length;
    expect(newSize).toBeLessThan(originalSize);

    const teamEntries = await readdir(join(rootDir, 'assets', 'team'));
    expect(teamEntries.every((e) => !e.includes('.tmp-'))).toBe(true);
  });

  it('PNGs under the threshold are reported as skip (under threshold)', async () => {
    const result = await run({ rootDir, write: false, thresholdKb: 400 });

    const tinyEntry = result.results.find((r) => r.path === 'assets/clients/tiny.png');
    expect(tinyEntry?.skipped).toBe('under-threshold');
  });

  it('--paths restricts processing to the given files', async () => {
    const result = await run({
      rootDir,
      write: false,
      paths: ['assets/team/oversized.jpg'],
    });

    expect(result.results.map((r) => r.path)).toEqual(['assets/team/oversized.jpg']);
  });

  it('errors on --paths outside assets/ cause run() to throw', async () => {
    await expect(
      run({ rootDir, write: false, paths: ['scripts/foo.js'] }),
    ).rejects.toThrow(/escap|outside/i);
  });

  it('no-gain PNG is left untouched on disk under --write', async () => {
    // Seed a PNG, optimise it once so it's already palette-encoded at L9, then
    // re-run with a threshold below its post-optimisation size. The second pass
    // hits the no-gain guard (re-encoded buffer >= input) and must not rewrite.
    const isolatedRoot = await mkdtemp(join(tmpdir(), 'optimize-assets-nogain-'));
    try {
      await mkdir(join(isolatedRoot, 'assets', 'posts', 'a'), { recursive: true });
      const target = join(isolatedRoot, 'assets', 'posts', 'a', 'pic.png');
      const seed = await makePng(300, 300);
      await writeFile(target, seed);

      await run({ rootDir: isolatedRoot, write: true, thresholdKb: 0 });
      const afterFirst = await readFile(target);

      const result = await run({ rootDir: isolatedRoot, write: true, thresholdKb: 0 });

      const entry = result.results.find((r) => r.path === 'assets/posts/a/pic.png');
      expect(entry?.skipped).toBe('no-gain');

      const afterSecond = await readFile(target);
      expect(afterSecond.equals(afterFirst)).toBe(true);
    } finally {
      await rm(isolatedRoot, { recursive: true, force: true });
    }
  });
});
