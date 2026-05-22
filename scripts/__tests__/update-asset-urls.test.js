import { describe, expect, it } from 'vitest';

const {
  CONTENT_DIRS,
  LEGACY_HOST,
  NEW_HOST,
  parseArgs,
  resolveBaseUrl,
  updateMarkdownContent,
} = await import('../update-asset-urls.js');

describe('parseArgs', () => {
  it('defaults target to legacy', () => {
    expect(parseArgs([])).toEqual({ help: false, target: 'legacy' });
  });

  it('parses --target new', () => {
    expect(parseArgs(['--target', 'new'])).toEqual({ help: false, target: 'new' });
  });

  it('parses --help and -h', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('rejects invalid --target value', () => {
    expect(() => parseArgs(['--target', 'bogus'])).toThrow(/Invalid --target value/);
  });

  it('rejects unknown flags (typo detection)', () => {
    expect(() => parseArgs(['--targt', 'new'])).toThrow(/Unknown argument/);
  });
});

describe('CONTENT_DIRS', () => {
  it('scans blog, stories, legal, team, and tools', () => {
    expect(CONTENT_DIRS).toEqual(['blog', 'stories', 'legal', 'team', 'tools']);
  });
});

describe('resolveBaseUrl', () => {
  it('returns legacy host for legacy target', () => {
    expect(resolveBaseUrl('legacy')).toBe(`https://${LEGACY_HOST}/content/`);
  });

  it('returns new host for new target', () => {
    expect(resolveBaseUrl('new')).toBe(`https://${NEW_HOST}/content/`);
  });
});

describe('updateMarkdownContent', () => {
  it('rewrites /assets/... to legacy host by default', () => {
    const input = '![cover](/assets/posts/foo/cover.png)';
    const { content, replacements } = updateMarkdownContent(input);
    expect(content).toBe(`![cover](https://${LEGACY_HOST}/content/posts/foo/cover.png)`);
    expect(replacements).toBe(1);
  });

  it('rewrites /assets/... to new host with --target new', () => {
    const input = '![cover](/assets/posts/foo/cover.png)';
    const { content, replacements } = updateMarkdownContent(input, { target: 'new' });
    expect(content).toBe(`![cover](https://${NEW_HOST}/content/posts/foo/cover.png)`);
    expect(replacements).toBe(1);
  });

  it('rewrites relative assets/... paths', () => {
    const input = 'See assets/clients/logo.png';
    const { content, replacements } = updateMarkdownContent(input);
    expect(content).toBe(`See https://${LEGACY_HOST}/content/clients/logo.png`);
    expect(replacements).toBe(1);
  });

  it('rewrites absolute ocobo.co/assets URLs', () => {
    const input = '![x](https://www.ocobo.co/assets/posts/x/y.jpg)';
    const { content, replacements } = updateMarkdownContent(input, { target: 'new' });
    expect(content).toBe(`![x](https://${NEW_HOST}/content/posts/x/y.jpg)`);
    expect(replacements).toBe(1);
  });

  it('with target=new, rewrites legacy-host URLs to new-host URLs', () => {
    const input = `![a](https://${LEGACY_HOST}/content/posts/10/1.png)`;
    const { content, replacements } = updateMarkdownContent(input, { target: 'new' });
    expect(content).toBe(`![a](https://${NEW_HOST}/content/posts/10/1.png)`);
    expect(replacements).toBe(1);
  });

  it('with target=legacy, leaves legacy-host URLs untouched', () => {
    const input = `![a](https://${LEGACY_HOST}/content/posts/10/1.png)`;
    const { content, replacements } = updateMarkdownContent(input, { target: 'legacy' });
    expect(content).toBe(input);
    expect(replacements).toBe(0);
  });

  it('with target=legacy, does NOT pull URLs back from new host (one-way migration)', () => {
    const input = `![a](https://${NEW_HOST}/content/posts/10/1.png)`;
    const { content, replacements } = updateMarkdownContent(input, { target: 'legacy' });
    expect(content).toBe(input);
    expect(replacements).toBe(0);
  });

  it('returns 0 replacements when nothing matches', () => {
    const input = 'plain text with no assets';
    const { content, replacements } = updateMarkdownContent(input);
    expect(content).toBe(input);
    expect(replacements).toBe(0);
  });

  it('handles multiple replacements per file', () => {
    const input = [
      '/assets/posts/a/1.png',
      `https://${LEGACY_HOST}/content/posts/b/2.png`,
      'https://www.ocobo.co/assets/c/3.svg',
    ].join('\n');
    const { replacements } = updateMarkdownContent(input, { target: 'new' });
    expect(replacements).toBe(3);
  });
});
