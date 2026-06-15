import { describe, expect, it } from 'vitest';
import { resolveAssetPath } from '../asset-path-resolver.js';

describe('resolveAssetPath', () => {
  it('resolves blog-post path', () => {
    expect(resolveAssetPath('blog-post', 'my-post')).toBe('assets/posts/my-post');
  });

  it('resolves team-member path', () => {
    expect(resolveAssetPath('team-member', 'alice')).toBe('assets/team/alice');
  });

  it('resolves tool path', () => {
    expect(resolveAssetPath('tool', 'hubspot')).toBe('assets/tools/hubspot');
  });

  it('resolves job path', () => {
    expect(resolveAssetPath('job', 'revops-manager')).toBe('assets/jobs/revops-manager');
  });

  it('resolves story path without variant', () => {
    expect(resolveAssetPath('story', 'acme')).toBe('assets/clients/acme');
  });

  it('resolves story path with variant', () => {
    expect(resolveAssetPath('story', 'acme', 'color')).toBe('assets/clients/acme-color');
    expect(resolveAssetPath('story', 'acme', 'dark')).toBe('assets/clients/acme-dark');
    expect(resolveAssetPath('story', 'acme', 'white')).toBe('assets/clients/acme-white');
    expect(resolveAssetPath('story', 'acme', 'avatar')).toBe('assets/clients/acme-avatar');
  });

  it('throws on unknown type', () => {
    expect(() => resolveAssetPath('unknown', 'foo')).toThrow('Unknown content type: unknown');
  });
});
