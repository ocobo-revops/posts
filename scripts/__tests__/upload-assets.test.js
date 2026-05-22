import { execSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
}));

const { put } = await import('@vercel/blob');

const {
  findAssetFiles,
  formatBytes,
  getChangedAssets,
  getContentType,
  isImageFile,
  parseArgs,
  resolveToken,
  run,
  sanitizeMessage,
  verifyUrls,
} = await import('../upload-assets.js');

describe('isImageFile', () => {
  it('accepts allowlisted image extensions (case-insensitive)', () => {
    expect(isImageFile('cover.png')).toBe(true);
    expect(isImageFile('Cover.PNG')).toBe(true);
    expect(isImageFile('photo.jpg')).toBe(true);
    expect(isImageFile('photo.jpeg')).toBe(true);
    expect(isImageFile('icon.svg')).toBe(true);
    expect(isImageFile('hero.webp')).toBe(true);
    expect(isImageFile('loop.gif')).toBe(true);
  });

  it('rejects non-image extensions', () => {
    expect(isImageFile('readme.md')).toBe(false);
    expect(isImageFile('archive.zip')).toBe(false);
    expect(isImageFile('noext')).toBe(false);
  });
});

describe('getContentType', () => {
  it('maps known image extensions to MIME types', () => {
    expect(getContentType('a.png')).toBe('image/png');
    expect(getContentType('a.jpg')).toBe('image/jpeg');
    expect(getContentType('a.jpeg')).toBe('image/jpeg');
    expect(getContentType('a.svg')).toBe('image/svg+xml');
    expect(getContentType('a.webp')).toBe('image/webp');
    expect(getContentType('a.gif')).toBe('image/gif');
  });

  it('falls back to octet-stream for unknown extensions', () => {
    expect(getContentType('a.bin')).toBe('application/octet-stream');
    expect(getContentType('noext')).toBe('application/octet-stream');
  });
});

describe('formatBytes', () => {
  it('formats 0 explicitly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
  });

  it('formats with the largest appropriate unit', () => {
    expect(formatBytes(512)).toBe('512 Bytes');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });
});

describe('parseArgs', () => {
  it('returns defaults when no flags are passed', () => {
    expect(parseArgs(['node', 'script'])).toEqual({
      help: false,
      all: false,
      force: false,
      noVerify: false,
      target: 'legacy',
    });
  });

  it('recognises --help and -h', () => {
    expect(parseArgs(['node', 'script', '--help']).help).toBe(true);
    expect(parseArgs(['node', 'script', '-h']).help).toBe(true);
  });

  it('recognises --all and -a', () => {
    expect(parseArgs(['node', 'script', '--all']).all).toBe(true);
    expect(parseArgs(['node', 'script', '-a']).all).toBe(true);
  });

  it('recognises --force', () => {
    expect(parseArgs(['node', 'script', '--force']).force).toBe(true);
  });

  it('recognises --no-verify (default false)', () => {
    expect(parseArgs(['node', 'script']).noVerify).toBe(false);
    expect(parseArgs(['node', 'script', '--no-verify']).noVerify).toBe(true);
  });

  it('accepts --target new and --target legacy', () => {
    expect(parseArgs(['node', 'script', '--target', 'new']).target).toBe('new');
    expect(parseArgs(['node', 'script', '--target', 'legacy']).target).toBe('legacy');
  });

  it('throws on invalid --target value', () => {
    expect(() => parseArgs(['node', 'script', '--target', 'bogus'])).toThrow(/Invalid --target/);
  });

  it('throws when --target is passed without a value', () => {
    expect(() => parseArgs(['node', 'script', '--target'])).toThrow(/Invalid --target/);
  });

  it('throws on unknown flag (typo detection)', () => {
    expect(() => parseArgs(['node', 'script', '--targt', 'new'])).toThrow(/Unknown argument: --targt/);
    expect(() => parseArgs(['node', 'script', '--verify'])).toThrow(/Unknown argument: --verify/);
  });
});

describe('sanitizeMessage', () => {
  it('redacts vercel_blob_rw_ tokens', () => {
    const msg = 'request to https://x with token vercel_blob_rw_abc123_DEF456 failed';
    expect(sanitizeMessage(msg)).toBe(
      'request to https://x with token vercel_blob_rw_[REDACTED] failed',
    );
  });

  it('redacts multiple tokens in one string', () => {
    const msg = 'old=vercel_blob_rw_aaa new=vercel_blob_rw_bbb';
    expect(sanitizeMessage(msg)).toBe('old=vercel_blob_rw_[REDACTED] new=vercel_blob_rw_[REDACTED]');
  });

  it('returns input unchanged when no token is present', () => {
    expect(sanitizeMessage('plain error')).toBe('plain error');
  });

  it('coerces null/undefined to empty string', () => {
    expect(sanitizeMessage(null)).toBe('');
    expect(sanitizeMessage(undefined)).toBe('');
  });
});

describe('resolveToken', () => {
  it('returns NEW_BLOB_READ_WRITE_TOKEN for target=new', () => {
    expect(resolveToken('new', { NEW_BLOB_READ_WRITE_TOKEN: 'new-tok' })).toBe('new-tok');
  });

  it('returns BLOB_READ_WRITE_TOKEN for target=legacy', () => {
    expect(resolveToken('legacy', { BLOB_READ_WRITE_TOKEN: 'leg-tok' })).toBe('leg-tok');
  });

  it('falls back to VERCEL_BLOB_READ_WRITE_TOKEN for legacy when primary missing', () => {
    expect(resolveToken('legacy', { VERCEL_BLOB_READ_WRITE_TOKEN: 'vrc-tok' })).toBe('vrc-tok');
  });

  it('never falls back to legacy tokens when target=new', () => {
    expect(
      resolveToken('new', {
        BLOB_READ_WRITE_TOKEN: 'leg-tok',
        VERCEL_BLOB_READ_WRITE_TOKEN: 'vrc-tok',
      }),
    ).toBeNull();
  });

  it('returns null when no relevant env var is set', () => {
    expect(resolveToken('legacy', {})).toBeNull();
    expect(resolveToken('new', {})).toBeNull();
  });
});

describe('findAssetFiles', () => {
  let rootDir;
  let assetsDir;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'upload-assets-find-'));
    assetsDir = join(rootDir, 'assets');
    await mkdir(join(assetsDir, 'posts', 'slug-a'), { recursive: true });
    await mkdir(join(assetsDir, 'clients'), { recursive: true });
    await writeFile(join(assetsDir, 'posts', 'slug-a', 'cover.png'), 'png');
    await writeFile(join(assetsDir, 'posts', 'slug-a', 'notes.md'), 'md');
    await writeFile(join(assetsDir, 'clients', 'acme.svg'), '<svg/>');
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('walks recursively and returns only image files with posix blobPath', async () => {
    const files = await findAssetFiles(assetsDir);
    const paths = files.map((f) => f.blobPath).sort();
    expect(paths).toEqual(['clients/acme.svg', 'posts/slug-a/cover.png']);
    for (const f of files) {
      expect(f.size).toBeGreaterThan(0);
      expect(f.localPath.startsWith(assetsDir)).toBe(true);
    }
  });

  it('returns an empty list when the directory does not exist', async () => {
    const files = await findAssetFiles(join(rootDir, 'missing'));
    expect(files).toEqual([]);
  });
});

describe('getChangedAssets', () => {
  let rootDir;

  const git = (cmd) =>
    execSync(`git ${cmd}`, {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'upload-assets-git-'));
    git('init -q');
    git('config user.email "test@example.com"');
    git('config user.name "Test"');
    git('commit --allow-empty -q -m "init"');
    await mkdir(join(rootDir, 'assets', 'posts'), { recursive: true });
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('returns null outside a git repository', async () => {
    const nonRepo = await mkdtemp(join(tmpdir(), 'upload-assets-nogit-'));
    expect(getChangedAssets(nonRepo)).toBeNull();
    await rm(nonRepo, { recursive: true, force: true });
  });

  it('reports untracked image files only (filters non-images)', async () => {
    await writeFile(join(rootDir, 'assets', 'posts', 'fresh.png'), 'png');
    await writeFile(join(rootDir, 'assets', 'posts', 'notes.md'), 'md');
    const changed = getChangedAssets(rootDir);
    expect(changed).toContain('assets/posts/fresh.png');
    expect(changed).not.toContain('assets/posts/notes.md');
  });

  it('reports modified tracked files', async () => {
    await writeFile(join(rootDir, 'assets', 'posts', 'tracked.png'), 'v1');
    git('add assets/posts/tracked.png');
    git('commit -q -m "add tracked"');
    await writeFile(join(rootDir, 'assets', 'posts', 'tracked.png'), 'v2');
    const changed = getChangedAssets(rootDir);
    expect(changed).toContain('assets/posts/tracked.png');
  });

  it('returns an empty list when nothing changed', async () => {
    const changed = getChangedAssets(rootDir);
    expect(changed).toEqual([]);
  });
});

describe('verifyUrls', () => {
  const mkUploaded = (urls) => urls.map((url, i) => ({ url, blobPath: `path/${i}.png` }));
  const noRetry = { retries: 0, retryDelayMs: 0 };

  it('returns no failures when every HEAD responds ok', async () => {
    const fetchFn = async () => ({ status: 200, ok: true });
    const { failures } = await verifyUrls(mkUploaded(['u1', 'u2', 'u3']), { fetchFn, ...noRetry });
    expect(failures).toEqual([]);
  });

  it('collects non-ok responses as failures with status code', async () => {
    const fetchFn = async (url) =>
      url === 'bad' ? { status: 404, ok: false } : { status: 200, ok: true };
    const { failures } = await verifyUrls(mkUploaded(['ok1', 'bad', 'ok2']), {
      fetchFn,
      ...noRetry,
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ url: 'bad', status: 404 });
  });

  it('captures network errors as failures with status 0', async () => {
    const fetchFn = async () => {
      throw new Error('network down');
    };
    const { failures } = await verifyUrls(mkUploaded(['u1']), { fetchFn, ...noRetry });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ url: 'u1', status: 0, error: 'network down' });
  });

  it('issues one HEAD request per uploaded item when no retries', async () => {
    let calls = 0;
    const fetchFn = async () => {
      calls += 1;
      return { status: 200, ok: true };
    };
    await verifyUrls(mkUploaded(['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7']), {
      fetchFn,
      ...noRetry,
    });
    expect(calls).toBe(7);
  });

  it('uses HEAD with redirect: follow', async () => {
    const calls = [];
    const fetchFn = async (_url, init) => {
      calls.push({ method: init?.method, redirect: init?.redirect });
      return { status: 200, ok: true };
    };
    await verifyUrls(mkUploaded(['u1', 'u2']), { fetchFn, ...noRetry });
    expect(calls).toEqual([
      { method: 'HEAD', redirect: 'follow' },
      { method: 'HEAD', redirect: 'follow' },
    ]);
  });

  it('retries transient failures and reports ok if a later attempt succeeds', async () => {
    let attempt = 0;
    const fetchFn = async () => {
      attempt += 1;
      if (attempt === 1) return { status: 404, ok: false };
      return { status: 200, ok: true };
    };
    const { failures } = await verifyUrls(mkUploaded(['u1']), {
      fetchFn,
      retries: 2,
      retryDelayMs: 0,
    });
    expect(failures).toEqual([]);
    expect(attempt).toBe(2);
  });

  it('reports a failure only after exhausting all retries', async () => {
    let attempt = 0;
    const fetchFn = async () => {
      attempt += 1;
      return { status: 404, ok: false };
    };
    const { failures } = await verifyUrls(mkUploaded(['u1']), {
      fetchFn,
      retries: 2,
      retryDelayMs: 0,
    });
    expect(failures).toHaveLength(1);
    expect(attempt).toBe(3);
  });
});

describe('run (integration via vi.mock)', () => {
  let rootDir;
  const okFetch = async () => ({ status: 200, ok: true });
  const logs = [];
  const warns = [];
  const log = (m) => logs.push(String(m));
  const warn = (m) => warns.push(String(m));

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'upload-assets-run-'));
    await mkdir(join(rootDir, 'assets', 'posts', 'slug-a'), { recursive: true });
    await writeFile(join(rootDir, 'assets', 'posts', 'slug-a', 'cover.png'), 'png-bytes');
    await writeFile(join(rootDir, 'assets', 'posts', 'slug-a', 'hero.jpg'), 'jpg-bytes');
    logs.length = 0;
    warns.length = 0;
    put.mockReset();
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it('throws a clear error when --target new is used without NEW_BLOB_READ_WRITE_TOKEN', async () => {
    const prev = process.env.NEW_BLOB_READ_WRITE_TOKEN;
    delete process.env.NEW_BLOB_READ_WRITE_TOKEN;
    try {
      await expect(
        run({
          rootDir,
          argv: ['node', 'script', '--all', '--target', 'new'],
          log,
          warn,
        }),
      ).rejects.toThrow(/NEW_BLOB_READ_WRITE_TOKEN/);
    } finally {
      if (prev !== undefined) process.env.NEW_BLOB_READ_WRITE_TOKEN = prev;
    }
  });

  it('uploads all assets and verifies URLs when token + --all are passed', async () => {
    put.mockImplementation((path) => Promise.resolve({ url: `https://new.example/${path}` }));
    const result = await run({
      rootDir,
      argv: ['node', 'script', '--all'],
      token: 'tok',
      log,
      warn,
      batchDelayMs: 0,
      fetchFn: okFetch, // unused but harmless
    });
    expect(result.uploaded).toHaveLength(2);
    expect(put).toHaveBeenCalledTimes(2);
    for (const call of put.mock.calls) {
      const [path, _body, opts] = call;
      expect(path.startsWith('content/posts/slug-a/')).toBe(true);
      expect(opts).toMatchObject({
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        token: 'tok',
      });
    }
  });

  it('preserves partial successes and throws aggregate when one upload fails mid-batch', async () => {
    put.mockImplementation((path) => {
      if (path.endsWith('hero.jpg')) {
        return Promise.reject(new Error('boom for hero with vercel_blob_rw_secret123'));
      }
      return Promise.resolve({ url: `https://new.example/${path}` });
    });

    await expect(
      run({
        rootDir,
        argv: ['node', 'script', '--all', '--no-verify'],
        token: 'tok',
        log,
        warn,
        batchDelayMs: 0,
      }),
    ).rejects.toThrow(/1\/2 file\(s\) errored/);

    // The redacted reason must appear in warnings and never leak the token
    const warnText = warns.join('\n');
    expect(warnText).toContain('hero.jpg');
    expect(warnText).toContain('vercel_blob_rw_[REDACTED]');
    expect(warnText).not.toMatch(/vercel_blob_rw_secret123/);
  });

  it('skips HEAD verification when --no-verify is set', async () => {
    put.mockImplementation((path) => Promise.resolve({ url: `https://new.example/${path}` }));
    let fetchCalls = 0;
    const result = await run({
      rootDir,
      argv: ['node', 'script', '--all', '--no-verify'],
      token: 'tok',
      log,
      warn,
      batchDelayMs: 0,
      fetchFn: async () => {
        fetchCalls += 1;
        return { status: 200, ok: true };
      },
    });
    expect(result.uploaded).toHaveLength(2);
    expect(fetchCalls).toBe(0);
  });
});
