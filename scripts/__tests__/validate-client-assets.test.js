import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  checkClientAssets,
  findMissingStoryAvatars,
  findNonPngClientAssets,
} from '../validate-client-assets.js';

describe('findNonPngClientAssets', () => {
  it('flags non-png image assets', () => {
    const result = findNonPngClientAssets([
      'beev-avatar.jpeg',
      'beev-white.png',
      'citron-avatar.png',
      'combo-avatar.webp',
    ]);
    expect(result).toEqual(['beev-avatar.jpeg', 'combo-avatar.webp']);
  });

  it('returns empty when all assets are png', () => {
    expect(findNonPngClientAssets(['citron-avatar.png', 'citron-white.png'])).toEqual([]);
  });

  it('ignores non-image files', () => {
    expect(findNonPngClientAssets(['notes.txt', 'logo.png'])).toEqual([]);
  });
});

describe('findMissingStoryAvatars', () => {
  it('flags stories without a <slug>-avatar.png', () => {
    const result = findMissingStoryAvatars(
      ['beev', 'citron', 'dotworld'],
      ['beev-avatar.png', 'citron-avatar.png', 'dotworld-white.png'],
    );
    expect(result).toEqual(['dotworld']);
  });

  it('returns empty when every story has an avatar', () => {
    expect(findMissingStoryAvatars(['beev'], ['beev-avatar.png'])).toEqual([]);
  });
});

describe('checkClientAssets (fs)', () => {
  let root;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'client-assets-'));
    await mkdir(join(root, 'assets', 'clients'), { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const touch = (name) => writeFile(join(root, 'assets', 'clients', name), 'x');

  it('errors on a non-png asset and warns on a missing avatar', async () => {
    await touch('beev-avatar.jpeg');
    await touch('dotworld-white.png');

    const { errors, warnings } = checkClientAssets(root, ['beev', 'dotworld']);

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('beev-avatar.jpeg');
    // dotworld has no -avatar.png → warning; beev has a (wrong-ext) avatar so the
    // missing-png warning fires for beev too since beev-avatar.png is absent.
    expect(warnings.some((w) => w.includes('dotworld'))).toBe(true);
  });

  it('is clean when assets follow the png convention', async () => {
    await touch('citron-avatar.png');
    await touch('citron-white.png');

    const { errors, warnings } = checkClientAssets(root, ['citron']);

    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('returns empty when assets/clients is absent', () => {
    const { errors, warnings } = checkClientAssets(join(root, 'nope'), []);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });
});
