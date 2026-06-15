import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseContent, readLocalFile } from '../source-adapters/local-file.js';

const FIXTURES = join(fileURLToPath(import.meta.url), '..', 'fixtures');

// ── parseContent ──────────────────────────────────────────────────────────────

describe('parseContent — frontmatter', () => {
  it('extracts YAML fields and body', () => {
    const raw = `---\ntitle: Mon article\nauthor: alice\n---\n\nCorps.`;
    const { fields, body } = parseContent(raw);
    expect(fields.title).toBe('Mon article');
    expect(fields.author).toBe('alice');
    expect(body).toBe('Corps.');
  });

  it('returns empty body when frontmatter only', () => {
    const raw = `---\ntitle: Titre\nauthor: bob\n---\n`;
    const { fields, body } = parseContent(raw);
    expect(fields.title).toBe('Titre');
    expect(body).toBe('');
  });

  it('preserves array fields', () => {
    const raw = `---\ntags:\n  - strategy\n  - ops\n---\n\nCorps.`;
    const { fields } = parseContent(raw);
    expect(fields.tags).toEqual(['strategy', 'ops']);
  });
});

describe('parseContent — key-value', () => {
  it('extracts ≥2 leading key: value pairs into fields', () => {
    const raw = `title: Mon article\nauthor: alice\n\nCorps en prose.`;
    const { fields, body } = parseContent(raw);
    expect(fields.title).toBe('Mon article');
    expect(fields.author).toBe('alice');
    expect(body).toBe('Corps en prose.');
  });

  it('preserves values that contain colons', () => {
    const raw = `time: 10:30\nlocation: Paris: 8e\n\nCorps.`;
    const { fields } = parseContent(raw);
    expect(fields.time).toBe('10:30');
    expect(fields.location).toBe('Paris: 8e');
  });

  it('falls back to prose when fewer than 2 kv pairs', () => {
    const raw = `title: Seulement une clé\n\nCorps.`;
    const { fields, body } = parseContent(raw);
    expect(Object.keys(fields)).toHaveLength(0);
    expect(body).toContain('Seulement une clé');
  });

  it('treats prose with a single inline colon as prose', () => {
    const raw = `Ceci est: du texte.\nDeuxième ligne sans clé.`;
    const { fields, body } = parseContent(raw);
    expect(Object.keys(fields)).toHaveLength(0);
    expect(body).toContain('Ceci est: du texte.');
  });
});

describe('parseContent — prose', () => {
  it('returns empty fields and full content as body', () => {
    const raw = `Ceci est du texte brut sans structure.\n\nDeuxième paragraphe.`;
    const { fields, body } = parseContent(raw);
    expect(Object.keys(fields)).toHaveLength(0);
    expect(body).toBe(raw.trim());
  });

  it('handles empty string', () => {
    const { fields, body } = parseContent('');
    expect(Object.keys(fields)).toHaveLength(0);
    expect(body).toBe('');
  });
});

// ── readLocalFile — fixture integration ───────────────────────────────────────

describe('readLocalFile', () => {
  it('parses fixture with frontmatter', async () => {
    const { fields, body } = await readLocalFile(join(FIXTURES, 'local-file-frontmatter.md'));
    expect(fields.title).toBe('Mon article de test');
    expect(fields.author).toBe('alice');
    expect(fields.date).toBeInstanceOf(Date);
    expect(fields.tags).toEqual(['strategy', 'ops']);
    expect(body).toContain('Corps de l\'article');
  });

  it('parses fixture with key-value pairs', async () => {
    const { fields, body } = await readLocalFile(join(FIXTURES, 'local-file-key-value.txt'));
    expect(fields.title).toBe('Mon article de test');
    expect(fields.author).toBe('alice');
    expect(body).toContain('Corps de l\'article');
  });

  it('parses prose fixture with empty fields', async () => {
    const { fields, body } = await readLocalFile(join(FIXTURES, 'local-file-prose.md'));
    expect(Object.keys(fields)).toHaveLength(0);
    expect(body).toContain('Ceci est un article');
  });

  it('rejects on non-existent path', async () => {
    await expect(readLocalFile(join(FIXTURES, 'does-not-exist.md'))).rejects.toThrow();
  });
});
