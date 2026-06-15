import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { mapNotionPage, extractAssets } from '../source-adapters/notion.js';

const FIXTURES = join(fileURLToPath(import.meta.url), '..', 'fixtures');

const loadFixture = async (name) => {
  const raw = await readFile(join(FIXTURES, name), 'utf8');
  return JSON.parse(raw);
};

// ── mapNotionPage — blog-post ─────────────────────────────────────────────────

describe('mapNotionPage — blog-post', () => {
  it('maps all present properties to fields', async () => {
    const page = await loadFixture('notion-blog-post.json');
    const { fields } = mapNotionPage(page, 'blog-post');

    expect(fields.title).toBe('Comment Yousign a transformé sa RevOps');
    expect(fields.author).toBe('jerome-boileux');
    expect(fields.description).toBe('Un retour d\'expérience sur la structuration RevOps.');
    expect(fields.date).toBe('2024-03-15');
    expect(fields.image).toBe('https://prod-files-secure.s3.us-west-2.amazonaws.com/cover.jpg');
    expect(fields.tags).toEqual(['strategy', 'ops']);
    expect(fields.read).toBe('6 min');
    expect(fields.lang).toBe('fr');
  });

  it('excludes undefined optional fields', async () => {
    const page = await loadFixture('notion-blog-post.json');
    const { fields } = mapNotionPage(page, 'blog-post');
    expect(fields.exerpt).toBeUndefined();
    expect(fields.podcastId).toBeUndefined();
  });

  it('includes body from second arg', async () => {
    const page = await loadFixture('notion-blog-post.json');
    const { body } = mapNotionPage(page, 'blog-post', '  Corps de l\'article.  ');
    expect(body).toBe('Corps de l\'article.');
  });

  it('returns empty body when not provided', async () => {
    const page = await loadFixture('notion-blog-post.json');
    const { body } = mapNotionPage(page, 'blog-post');
    expect(body).toBe('');
  });

  it('extracts image into assets array', async () => {
    const page = await loadFixture('notion-blog-post.json');
    const { assets } = mapNotionPage(page, 'blog-post');
    expect(assets).toHaveLength(1);
    expect(assets[0].field).toBe('Image');
    expect(assets[0].url).toContain('cover.jpg');
  });
});

// ── mapNotionPage — story ─────────────────────────────────────────────────────

describe('mapNotionPage — story', () => {
  it('maps all present properties', async () => {
    const page = await loadFixture('notion-story.json');
    const { fields } = mapNotionPage(page, 'story');

    expect(fields.name).toBe('Yousign');
    expect(fields.date).toBe('2024-01-10');
    expect(fields.title).toBe('De 0 à une équipe RevOps en 18 mois');
    expect(fields.scopes).toEqual(['Acquisition', 'CRM']);
    expect(fields.tools).toEqual(['hubspot', 'gsheet']);
    expect(fields.featuredTool).toBe('hubspot');
  });

  it('excludes optional fields not set in Notion', async () => {
    const page = await loadFixture('notion-story.json');
    const { fields } = mapNotionPage(page, 'story');
    expect(fields.quotes).toBeUndefined();
    expect(fields.deliverables).toBeUndefined();
    expect(fields.lang).toBeUndefined();
  });
});

// ── mapNotionPage — team-member ───────────────────────────────────────────────

describe('mapNotionPage — team-member', () => {
  it('assembles nested role and bio objects', async () => {
    const page = await loadFixture('notion-team-member.json');
    const { fields } = mapNotionPage(page, 'team-member');

    expect(fields.role).toEqual({ fr: 'Associée', en: 'Partner' });
    expect(fields.bio).toEqual({
      fr: 'Alice accompagne les équipes RevOps depuis 10 ans.',
      en: 'Alice has been supporting RevOps teams for 10 years.',
    });
  });

  it('extracts avatar from external files property', async () => {
    const page = await loadFixture('notion-team-member.json');
    const { fields, assets } = mapNotionPage(page, 'team-member');
    expect(fields.avatar).toBe('https://example.com/alice.jpg');
    expect(assets.some((a) => a.field === 'Avatar')).toBe(true);
  });

  it('maps checkbox and url properties', async () => {
    const page = await loadFixture('notion-team-member.json');
    const { fields } = mapNotionPage(page, 'team-member');
    expect(fields.active).toBe(true);
    expect(fields.linkedin).toBe('https://linkedin.com/in/alice-dupont');
    expect(fields.color).toBe('coral');
  });

  it('preserves active: false — does not drop falsy checkbox', () => {
    const page = {
      properties: {
        Name: { type: 'title', title: [{ plain_text: 'Bob' }] },
        'Role FR': { type: 'rich_text', rich_text: [{ plain_text: 'Consultant' }] },
        'Role EN': { type: 'rich_text', rich_text: [{ plain_text: 'Consultant' }] },
        Track: { type: 'select', select: { name: 'builder' } },
        Avatar: { type: 'url', url: 'https://example.com/bob.jpg' },
        'Bio FR': { type: 'rich_text', rich_text: [{ plain_text: 'Bio FR.' }] },
        'Bio EN': { type: 'rich_text', rich_text: [{ plain_text: 'Bio EN.' }] },
        Active: { type: 'checkbox', checkbox: false },
      },
    };
    const { fields } = mapNotionPage(page, 'team-member');
    expect(fields.active).toBe(false);
  });
});

// ── mapNotionPage — tool / job (inline fixtures) ──────────────────────────────

describe('mapNotionPage — tool', () => {
  const toolPage = {
    id: 't1',
    properties: {
      Name: { type: 'title', title: [{ plain_text: 'HubSpot' }] },
      Category: { type: 'select', select: { name: 'CRM' } },
    },
  };

  it('maps name and category', () => {
    const { fields } = mapNotionPage(toolPage, 'tool');
    expect(fields.name).toBe('HubSpot');
    expect(fields.category).toBe('CRM');
  });

  it('returns empty assets when no files property', () => {
    const { assets } = mapNotionPage(toolPage, 'tool');
    expect(assets).toHaveLength(0);
  });
});

describe('mapNotionPage — job', () => {
  const jobPage = {
    id: 'j1',
    properties: {
      Title: { type: 'title', title: [{ plain_text: 'RevOps Manager' }] },
      'Contract type': { type: 'select', select: { name: 'CDI' } },
      Seniority: { type: 'rich_text', rich_text: [{ plain_text: '3-5 ans' }] },
      Location: { type: 'rich_text', rich_text: [{ plain_text: 'Paris' }] },
      'Start date': { type: 'date', date: { start: '2024-09-01' } },
      'Hiring contact': { type: 'select', select: { name: 'alice' } },
      'Tally form ID': { type: 'rich_text', rich_text: [{ plain_text: 'abc123' }] },
      Status: { type: 'select', select: { name: 'published' } },
      'Published at': { type: 'date', date: { start: '2024-08-01' } },
    },
  };

  it('maps all required job fields', () => {
    const { fields } = mapNotionPage(jobPage, 'job');
    expect(fields.title).toBe('RevOps Manager');
    expect(fields.contractType).toBe('CDI');
    expect(fields.startDate).toBe('2024-09-01');
    expect(fields.hiringContact).toBe('alice');
    expect(fields.status).toBe('published');
  });
});

// ── mapNotionPage — edge cases ────────────────────────────────────────────────

describe('mapNotionPage — edge cases', () => {
  it('throws on unknown type', () => {
    expect(() => mapNotionPage({ properties: {} }, 'unknown')).toThrow('Unknown content type: unknown');
  });

  it('handles missing properties gracefully (empty page)', () => {
    const { fields, body, assets } = mapNotionPage({}, 'blog-post');
    expect(Object.keys(fields)).toHaveLength(0);
    expect(body).toBe('');
    expect(assets).toHaveLength(0);
  });

  it('does not crash when a property value is null', () => {
    const page = { properties: { Title: null, Author: { type: 'select', select: { name: 'alice' } } } };
    expect(() => mapNotionPage(page, 'blog-post')).not.toThrow();
  });

  it('takes first file URL when multiple files present', () => {
    const page = {
      properties: {
        Image: {
          type: 'files',
          files: [
            { type: 'file', file: { url: 'https://example.com/first.jpg' } },
            { type: 'file', file: { url: 'https://example.com/second.jpg' } },
          ],
        },
      },
    };
    const { fields } = mapNotionPage(page, 'blog-post');
    expect(fields.image).toBe('https://example.com/first.jpg');
  });
});

// ── extractAssets ─────────────────────────────────────────────────────────────

describe('extractAssets', () => {
  it('returns one entry per file URL across all files properties', async () => {
    const page = await loadFixture('notion-blog-post.json');
    const assets = extractAssets(page);
    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ field: 'Image', url: expect.stringContaining('cover.jpg') });
  });

  it('returns empty array when no files properties', () => {
    const page = { properties: { Title: { type: 'title', title: [] } } };
    expect(extractAssets(page)).toHaveLength(0);
  });
});
