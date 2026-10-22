import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { validateChallenge } from '../schemas/challenge.schema.js';
import { STAGE_IDS } from '../schemas/stage-ids.js';

// One golden fixture per challenge, built from the text of the six enjeux-*.html
// mockups in ocobo-revops/prototype, without the agent window. Only the Sales
// Compensation mockup has a partner block.
const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/challenges');
const loadFixture = (file) => matter(readFileSync(join(FIXTURES_DIR, file), 'utf8')).data;

const base = loadFixture('revenue-performance.md');

const withValue = (path, value, from = base) => {
  const data = structuredClone(from);
  const parent = path.slice(0, -1).reduce((node, key) => node[key], data);
  parent[path.at(-1)] = value;
  return data;
};

const without = (path, from = base) => {
  const data = structuredClone(from);
  const parent = path.slice(0, -1).reduce((node, key) => node[key], data);
  delete parent[path.at(-1)];
  return data;
};

const issuesOf = (data) => {
  const result = validateChallenge(data);
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path, message: i.message }));
};

// ── golden fixtures ───────────────────────────────────────────────────────────

describe('challenge golden fixtures', () => {
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith('.md'));

  it('has one fixture per challenge key', () => {
    expect(files.map((f) => loadFixture(f).key).sort()).toEqual(['ai', 'cx', 'rp', 'sc', 'se', 'sy']);
  });

  // The slug is the English kebab-case of the name, the same in both languages.
  it.each(files)('%s is named after its challenge', (file) => {
    expect(file).toBe(`${loadFixture(file).name.toLowerCase().replaceAll(' ', '-')}.md`);
  });

  it.each(files)('%s passes', (file) => {
    expect(issuesOf(loadFixture(file))).toEqual([]);
  });

  it('the Revenue AI fixture sets the heading overrides', () => {
    const ai = loadFixture('revenue-ai.md');
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

describe('challenge caps', () => {
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

describe('challenge strings', () => {
  it('trims every string', () => {
    const result = validateChallenge(withValue(['hero', 'quote'], '  Une citation.  '));
    expect(result.data.hero.quote).toBe('Une citation.');
  });

  it.each([
    [['name']],
    [['symptoms', 'items', 2]],
    [['audience', 3, 'benefit']],
    [['method', 'tools', 0]],
  ])('rejects a blank string at %j', (path) => {
    expect(issuesOf(withValue(path, '   '))).toEqual([{ path, message: 'must not be empty' }]);
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

describe('challenge array counts', () => {
  it.each(COUNTS)('%j accepts %i to %i items', (path, min, max) => {
    expect(issuesOf(withValue(path, resize(path, min)))).toEqual([]);
    expect(issuesOf(withValue(path, resize(path, max)))).toEqual([]);
  });

  it.each(COUNTS)('%j rejects fewer than %i or more than %i items', (path, min, max) => {
    const error = [{ path, message: expect.any(String) }];
    if (min > 0) {
      expect(issuesOf(withValue(path, resize(path, min - 1)))).toEqual(error);
    }
    expect(issuesOf(withValue(path, resize(path, max + 1)))).toEqual(error);
  });
});

// ── Stage ids ─────────────────────────────────────────────────────────────────

describe('challenge Stage ids', () => {
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
    expect(issuesOf(withValue(['bowtie', 'activeStages'], []))).toEqual([
      { path: ['bowtie', 'activeStages'], message: expect.any(String) },
    ]);
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

describe('challenge key, order and step', () => {
  it.each(['rp', 'se', 'sc', 'cx', 'sy', 'ai'])('accepts key %s', (key) => {
    expect(issuesOf(withValue(['key'], key))).toEqual([]);
  });

  it('rejects an unknown key', () => {
    expect(issuesOf(withValue(['key'], 'ops'))).toEqual([{ path: ['key'], message: expect.any(String) }]);
  });

  it.each([1, 6])('accepts order %i', (order) => {
    expect(issuesOf(withValue(['order'], order))).toEqual([]);
  });

  it.each([0, 7, 2.5, '3'])('rejects order %j', (order) => {
    expect(issuesOf(withValue(['order'], order))).toEqual([{ path: ['order'], message: expect.any(String) }]);
  });

  it.each([1, 6])('accepts workstream step %i', (step) => {
    expect(issuesOf(withValue(['workstreams', 'items', 0, 'step'], step))).toEqual([]);
  });

  it.each([0, 7, 1.5])('rejects workstream step %j', (step) => {
    expect(issuesOf(withValue(['workstreams', 'items', 0, 'step'], step))).toEqual([
      { path: ['workstreams', 'items', 0, 'step'], message: expect.any(String) },
    ]);
  });
});

// ── optional and required fields ──────────────────────────────────────────────

describe('challenge optional fields', () => {
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
    expect(issuesOf(without(path))).toEqual([{ path, message: expect.any(String) }]);
  });
});

// ── partner block ─────────────────────────────────────────────────────────────

const partnered = structuredClone({ ...base, partner: loadFixture('sales-compensation.md').partner });

const PARTNER_CAPS = [
  [['partner', 'sentence'], 140],
  [['partner', 'metrics', 0, 'before'], 12],
  [['partner', 'metrics', 0, 'after'], 12],
  [['partner', 'metrics', 0, 'label'], 90],
  [['partner', 'source'], 90],
];

describe('challenge partner block', () => {
  it('is optional', () => {
    expect(base.partner).toBeUndefined();
    expect(issuesOf(base)).toEqual([]);
  });

  it('is open to any challenge', () => {
    expect(base.key).not.toBe('sc');
    expect(issuesOf(partnered)).toEqual([]);
  });

  it.each(PARTNER_CAPS)('%j accepts %i characters', (path, cap) => {
    expect(issuesOf(withValue(path, 'a'.repeat(cap), partnered))).toEqual([]);
  });

  it.each(PARTNER_CAPS)('%j rejects one character over cap %i, stating length, cap and overage', (path, cap) => {
    expect(issuesOf(withValue(path, 'a'.repeat(cap + 1), partnered))).toEqual([
      { path, message: `${cap + 1} characters, cap ${cap} (1 over)` },
    ]);
  });

  it.each([1, 3])('rejects %i metrics', (count) => {
    const metrics = Array.from({ length: count }, () => structuredClone(partnered.partner.metrics[0]));
    expect(issuesOf(withValue(['partner', 'metrics'], metrics, partnered))).toEqual([
      { path: ['partner', 'metrics'], message: expect.any(String) },
    ]);
  });

  it.each([
    [['partner', 'tool']],
    [['partner', 'sentence']],
    [['partner', 'metrics']],
    [['partner', 'source']],
    [['partner', 'metrics', 1, 'after']],
  ])('rejects a missing %j', (path) => {
    expect(issuesOf(without(path, partnered))).toEqual([{ path, message: expect.any(String) }]);
  });

  it('rejects a blank Tool slug', () => {
    expect(issuesOf(withValue(['partner', 'tool'], '   ', partnered))).toEqual([
      { path: ['partner', 'tool'], message: 'must not be empty' },
    ]);
  });

  it.each([
    [['partner', 'logo']],
    [['partner', 'metrics', 0, 'trend']],
  ])('rejects the unknown key %j', (path) => {
    expect(issuesOf(withValue(path, 'x', partnered))).toEqual([
      { path: path.slice(0, -1), message: `Unrecognized key: "${path.at(-1)}"` },
    ]);
  });
});

// ── unknown keys ──────────────────────────────────────────────────────────────

describe('challenge unknown keys', () => {
  it('rejects extraSections', () => {
    expect(issuesOf({ ...base, extraSections: [{ type: 'stack' }] })).toEqual([
      { path: [], message: 'Unrecognized key: "extraSections"' },
    ]);
  });

  it.each([
    [['hero', 'subtitle']],
    [['bowtie', 'legend']],
    [['symptoms', 'intro']],
    [['workstreams', 'cta']],
    [['aiBridge', 'demo']],
    [['method', 'cta']],
    [['case', 'quote']],
    [['diagnostic', 'cta']],
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
