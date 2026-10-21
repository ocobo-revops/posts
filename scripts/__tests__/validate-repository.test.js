import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateRepository } from '../validate-repository.js';

const TEAM_MEMBER = `---
name: Alice
role:
  fr: Consultante
  en: Consultant
track: RevOps
avatar: https://example.com/alice.png
bio:
  fr: Bio
  en: Bio
displayOrder: 1
---
`;

const TOOL = '---\nname: HubSpot\ncategory: CRM\n---\n';

const blogPost = ({ author = 'alice', title = 'A post' } = {}) => `---
title: ${title}
author: ${author}
description: A description
date: 2026-01-15
image: https://example.com/post.png
---
Body
`;

let repoRoot;

const write = (file, content) => {
  const abs = join(repoRoot, file);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
};

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'ocobo-validate-'));
  write('team/alice.md', TEAM_MEMBER);
  write('tools/hubspot.md', TOOL);
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
});

describe('validateRepository', () => {
  it('returns no failures for a valid repository', () => {
    write('blog/fr/a-post.md', blogPost());

    expect(validateRepository(repoRoot)).toEqual({
      failures: [],
      assetErrors: [],
      assetWarnings: [],
    });
  });

  it('reports a schema error against the failing file', () => {
    write('blog/fr/a-post.md', blogPost({ title: '""' }));

    const { failures } = validateRepository(repoRoot);

    expect(failures).toHaveLength(1);
    expect(failures[0].file).toBe('blog/fr/a-post.md');
    expect(failures[0].schemaErrors).toEqual([
      { path: ['title'], message: expect.any(String) },
    ]);
    expect(failures[0].crossRefErrors).toEqual([]);
  });

  it('reports a dangling author cross-reference', () => {
    write('blog/en/a-post.md', blogPost({ author: 'ghost' }));

    const { failures } = validateRepository(repoRoot);

    expect(failures).toEqual([
      {
        file: 'blog/en/a-post.md',
        schemaErrors: [],
        crossRefErrors: [
          { path: ['author'], message: '"ghost" does not match any team slug' },
        ],
      },
    ]);
  });

  it('returns client asset errors and warnings without failing any file', () => {
    write('assets/clients/acme-avatar.jpeg', '');

    const { failures, assetErrors, assetWarnings } = validateRepository(repoRoot);

    expect(failures).toEqual([]);
    expect(assetErrors).toEqual([expect.stringContaining('assets/clients/acme-avatar.jpeg')]);
    expect(assetWarnings).toEqual([]);
  });

  it('reports a team member citing a missing tool slug', () => {
    write('team/bob.md', `${TEAM_MEMBER.replace(/---\n$/, '')}enjeu: sc
contribution:
  fr: Contribution
  en: Contribution
tools:
  - hubspot
  - ghost-tool
---
`);

    const { failures } = validateRepository(repoRoot);

    expect(failures).toEqual([
      {
        file: 'team/bob.md',
        schemaErrors: [],
        crossRefErrors: [
          { path: ['tools'], message: '"ghost-tool" does not match any tool slug' },
        ],
      },
    ]);
  });

  it('accepts a team member whose tools are all existing tool slugs', () => {
    write('team/bob.md', `${TEAM_MEMBER.replace(/---\n$/, '')}enjeu: sc
contribution:
  fr: Contribution
  en: Contribution
tools:
  - hubspot
---
`);

    expect(validateRepository(repoRoot).failures).toEqual([]);
  });

  it('reports a schema error, not a crash, when tools is not an array', () => {
    write('team/bob.md', `${TEAM_MEMBER.replace(/---\n$/, '')}tools: hubspot
---
`);

    const { failures } = validateRepository(repoRoot);

    expect(failures).toHaveLength(1);
    expect(failures[0].file).toBe('team/bob.md');
    expect(failures[0].schemaErrors).toEqual([{ path: ['tools'], message: expect.any(String) }]);
    expect(failures[0].crossRefErrors).toEqual([]);
  });
});
