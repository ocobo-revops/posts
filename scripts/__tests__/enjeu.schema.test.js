import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { validateEnjeu } from '../schemas/enjeu.schema.js';
import { STAGE_IDS } from '../schemas/stage-ids.js';

// One golden fixture per enjeu, built from the text of the six enjeux-*.html
// mockups in ocobo-revops/prototype, without the partner block and the agent
// window.
const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/enjeux');
const loadFixture = (file) => matter(readFileSync(join(FIXTURES_DIR, file), 'utf8')).data;

const base = loadFixture('previsibilite.md');

const withValue = (path, value) => {
  const data = structuredClone(base);
  const parent = path.slice(0, -1).reduce((node, key) => node[key], data);
  parent[path.at(-1)] = value;
  return data;
};

const without = (path) => {
  const data = structuredClone(base);
  const parent = path.slice(0, -1).reduce((node, key) => node[key], data);
  delete parent[path.at(-1)];
  return data;
};

const issuesOf = (data) => {
  const result = validateEnjeu(data);
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path, message: i.message }));
};

// ── golden fixtures ───────────────────────────────────────────────────────────

describe('enjeu golden fixtures', () => {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.md'));

  it('has one fixture per enjeu key', () => {
    expect(files.map((f) => loadFixture(f).key).sort()).toEqual(['ai', 'cx', 'rp', 'sc', 'se', 'sy']);
  });

  it.each(files)('%s passes', (file) => {
    expect(issuesOf(loadFixture(file))).toEqual([]);
  });

  it('Revenue AI overrides the method and workstreams headings', () => {
    const ai = loadFixture('ia.md');
    expect(ai.method.title).toBeDefined();
    expect(ai.method.steps.every((s) => s.title)).toBe(true);
    expect(ai.workstreams.title).toBeDefined();
  });
});

// ── caps ──────────────────────────────────────────────────────────────────────

const CAPS = [
  [['name'], 30],
  [['tagline'], 60],
  [['hero', 'title', 0], 34],
  [['hero', 'title', 1], 42],
  [['hero', 'quote'], 80],
  [['hero', 'lead'], 240],
  [['hero', 'highlight'], 110],
  [['hero', 'cta'], 48],
  [['bowtie', 'caption'], 140],
  [['symptoms', 'title', 0], 64],
  [['symptoms', 'title', 1], 44],
  [['symptoms', 'items', 0], 130],
  [['audience', 0, 'team'], 20],
  [['audience', 0, 'roles'], 30],
  [['audience', 0, 'benefit'], 100],
  [['workstreams', 'title'], 50],
  [['workstreams', 'intro'], 120],
  [['workstreams', 'items', 0, 'category'], 26],
  [['workstreams', 'items', 0, 'title'], 64],
  [['workstreams', 'items', 0, 'description'], 210],
  [['workstreams', 'items', 0, 'deliverable'], 170],
  [['workstreams', 'items', 0, 'note'], 100],
  [['aiBridge', 'title'], 92],
  [['aiBridge', 'bullets', 0], 125],
  [['method', 'title'], 30],
  [['method', 'subtitle'], 75],
  [['method', 'steps', 0, 'title'], 28],
  [['method', 'steps', 0, 'text'], 150],
  [['method', 'note'], 170],
  [['case', 'headline'], 120],
  [['case', 'summary'], 220],
  [['case', 'metrics', 0, 'value'], 12],
  [['case', 'metrics', 0, 'label'], 90],
  [['diagnostic', 'question'], 88],
  [['diagnostic', 'subtitle'], 125],
];

describe('enjeu caps', () => {
  it.each(CAPS)('%j accepts %i characters', (path, cap) => {
    expect(issuesOf(withValue(path, 'a'.repeat(cap)))).toEqual([]);
  });

  it.each(CAPS)('%j rejects one character over cap %i, stating length, cap and overage', (path, cap) => {
    expect(issuesOf(withValue(path, 'a'.repeat(cap + 1)))).toEqual([
      { path, message: `${cap + 1} characters, cap ${cap} (1 over)` },
    ]);
  });

  it('measures the overage of a long text', () => {
    expect(issuesOf(withValue(['hero', 'lead'], 'a'.repeat(263)))).toEqual([
      { path: ['hero', 'lead'], message: '263 characters, cap 240 (23 over)' },
    ]);
  });

  it('measures the length after trimming', () => {
    expect(issuesOf(withValue(['name'], `  ${'a'.repeat(30)}  `))).toEqual([]);
  });
});

// ── strings ───────────────────────────────────────────────────────────────────

describe('enjeu strings', () => {
  it('trims every string', () => {
    const result = validateEnjeu(withValue(['hero', 'quote'], '  Une citation.  '));
    expect(result.data.hero.quote).toBe('Une citation.');
  });

  it.each([
    [['name']],
    [['symptoms', 'items', 2]],
    [['audience', 3, 'benefit']],
    [['method', 'tools', 0]],
  ])('rejects a blank string at %j', (path) => {
    expect(issuesOf(withValue(path, '   '))).toEqual([{ path, message: expect.any(String) }]);
  });
});

// ── array counts ──────────────────────────────────────────────────────────────

const COUNTS = [
  [['hero', 'title'], 2, 2],
  [['symptoms', 'title'], 2, 2],
  [['symptoms', 'items'], 5, 6],
  [['audience'], 4, 4],
  [['workstreams', 'items'], 4, 6],
  [['aiBridge', 'bullets'], 3, 3],
  [['method', 'steps'], 3, 3],
  [['method', 'tools'], 0, 9],
  [['case', 'metrics'], 2, 2],
];

const resize = (path, count) => {
  const items = path.reduce((node, key) => node[key], base);
  return Array.from({ length: count }, (_, i) => structuredClone(items[i % items.length]));
};

describe('enjeu array counts', () => {
  it.each(COUNTS)('%j accepts %i to %i items', (path, min, max) => {
    expect(issuesOf(withValue(path, resize(path, min)))).toEqual([]);
    expect(issuesOf(withValue(path, resize(path, max)))).toEqual([]);
  });

  it.each(COUNTS)('%j rejects fewer than %i or more than %i items', (path, min, max) => {
    if (min > 0) {
      expect(issuesOf(withValue(path, resize(path, min - 1)))).not.toEqual([]);
    }
    expect(issuesOf(withValue(path, resize(path, max + 1)))).not.toEqual([]);
  });
});

// ── Stage ids ─────────────────────────────────────────────────────────────────

describe('enjeu Stage ids', () => {
  it('lists the seven Stages in bow tie order', () => {
    expect(STAGE_IDS).toEqual([
      'demand-generation',
      'discovery',
      'negotiation',
      'closing',
      'onboarding',
      'adoption',
      'expansion',
    ]);
    expect(Object.isFrozen(STAGE_IDS)).toBe(true);
  });

  it('accepts every Stage id', () => {
    expect(issuesOf(withValue(['bowtie', 'activeStages'], [...STAGE_IDS]))).toEqual([]);
  });

  it('accepts a single Stage', () => {
    expect(issuesOf(withValue(['bowtie', 'activeStages'], ['closing']))).toEqual([]);
  });

  it('rejects no Stage', () => {
    expect(issuesOf(withValue(['bowtie', 'activeStages'], []))).not.toEqual([]);
  });

  it('rejects an unknown Stage id', () => {
    expect(issuesOf(withValue(['bowtie', 'activeStages'], ['discovery', 'qualification']))).toEqual([
      { path: ['bowtie', 'activeStages', 1], message: expect.any(String) },
    ]);
  });

  it('rejects a duplicate Stage id', () => {
    expect(issuesOf(withValue(['bowtie', 'activeStages'], ['discovery', 'closing', 'discovery']))).toEqual([
      { path: ['bowtie', 'activeStages'], message: 'Stage ids must be unique' },
    ]);
  });
});

// ── key, order, step ──────────────────────────────────────────────────────────

describe('enjeu key, order and step', () => {
  it.each(['rp', 'se', 'sc', 'cx', 'sy', 'ai'])('accepts key %s', (key) => {
    expect(issuesOf(withValue(['key'], key))).toEqual([]);
  });

  it('rejects an unknown key', () => {
    expect(issuesOf(withValue(['key'], 'ops'))).not.toEqual([]);
  });

  it.each([1, 6])('accepts order %i', (order) => {
    expect(issuesOf(withValue(['order'], order))).toEqual([]);
  });

  it.each([0, 7, 2.5, '3'])('rejects order %j', (order) => {
    expect(issuesOf(withValue(['order'], order))).not.toEqual([]);
  });

  it.each([1, 6])('accepts workstream step %i', (step) => {
    expect(issuesOf(withValue(['workstreams', 'items', 0, 'step'], step))).toEqual([]);
  });

  it.each([0, 7, 1.5])('rejects workstream step %j', (step) => {
    expect(issuesOf(withValue(['workstreams', 'items', 0, 'step'], step))).not.toEqual([]);
  });
});

// ── optional and required fields ──────────────────────────────────────────────

describe('enjeu optional fields', () => {
  it('accepts a case without a Story', () => {
    expect(base.case.story).toBeUndefined();
    expect(issuesOf(base)).toEqual([]);
  });

  it('accepts a case citing a Story', () => {
    expect(issuesOf(withValue(['case', 'story'], 'qonto'))).toEqual([]);
  });

  it.each([
    [['hero', 'lead']],
    [['bowtie', 'activeStages']],
    [['workstreams', 'intro']],
    [['method', 'tools']],
    [['diagnostic']],
  ])('rejects a missing %j', (path) => {
    expect(issuesOf(without(path))).not.toEqual([]);
  });
});

// ── unknown keys ──────────────────────────────────────────────────────────────

describe('enjeu unknown keys', () => {
  it('rejects extraSections', () => {
    expect(issuesOf({ ...base, extraSections: [{ type: 'stack' }] })).toEqual([
      { path: [], message: 'Unrecognized key: "extraSections"' },
    ]);
  });

  it.each([
    [['hero', 'subtitle']],
    [['audience', 0, 'icon']],
    [['workstreams', 'items', 0, 'image']],
    [['method', 'steps', 1, 'icon']],
    [['case', 'metrics', 0, 'trend']],
  ])('rejects the unknown key %j', (path) => {
    expect(issuesOf(withValue(path, 'x'))).toEqual([
      { path: path.slice(0, -1), message: `Unrecognized key: "${path.at(-1)}"` },
    ]);
  });
});
