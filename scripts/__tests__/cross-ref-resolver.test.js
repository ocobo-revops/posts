import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createResolver } from '../cross-ref-resolver.js';

let repoRoot;

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'ocobo-test-'));
  mkdirSync(join(repoRoot, 'team'));
  mkdirSync(join(repoRoot, 'tools'));

  writeFileSync(join(repoRoot, 'team/alice.md'), '---\nname: Alice\nactive: true\n---\n');
  writeFileSync(join(repoRoot, 'team/bob.md'), '---\nname: Bob\nactive: false\n---\n');
  writeFileSync(join(repoRoot, 'tools/hubspot.md'), '---\nname: HubSpot\ncategory: CRM\n---\n');
  writeFileSync(join(repoRoot, 'tools/salesforce.md'), '---\nname: Salesforce\ncategory: CRM\n---\n');
});

describe('createResolver', () => {
  it('validates an existing team slug', () => {
    const { isValidTeamSlug } = createResolver(repoRoot);
    expect(isValidTeamSlug('alice')).toBe(true);
    expect(isValidTeamSlug('bob')).toBe(true);
  });

  it('rejects an unknown team slug', () => {
    const { isValidTeamSlug } = createResolver(repoRoot);
    expect(isValidTeamSlug('charlie')).toBe(false);
  });

  it('getActiveTeamMembers excludes active:false members', () => {
    const { getActiveTeamMembers } = createResolver(repoRoot);
    const active = getActiveTeamMembers();
    expect(active.map((m) => m.slug)).toContain('alice');
    expect(active.map((m) => m.slug)).not.toContain('bob');
  });

  it('validates an existing tool slug', () => {
    const { isValidToolSlug } = createResolver(repoRoot);
    expect(isValidToolSlug('hubspot')).toBe(true);
  });

  it('rejects an unknown tool slug', () => {
    const { isValidToolSlug } = createResolver(repoRoot);
    expect(isValidToolSlug('notion')).toBe(false);
  });

  it('getActiveTools returns all tools', () => {
    const { getActiveTools } = createResolver(repoRoot);
    const tools = getActiveTools();
    expect(tools.map((t) => t.slug)).toEqual(expect.arrayContaining(['hubspot', 'salesforce']));
  });
});
