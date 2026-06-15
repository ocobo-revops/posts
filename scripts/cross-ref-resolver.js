import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';

const loadSlugs = (pattern, repoRoot) => {
  const files = glob.sync(pattern, { cwd: repoRoot });
  return files.map((f) => {
    const raw = readFileSync(join(repoRoot, f), 'utf8');
    const { data } = matter(raw);
    return { slug: f.replace(/\.md$/, '').split('/').pop(), ...data };
  });
};

export const createResolver = (repoRoot) => {
  const teamMembers = loadSlugs('team/*.md', repoRoot);
  const tools = loadSlugs('tools/*.md', repoRoot);

  return {
    isValidTeamSlug: (slug) => teamMembers.some((m) => m.slug === slug),
    getActiveTeamMembers: () => teamMembers.filter((m) => m.active !== false),
    isValidToolSlug: (slug) => tools.some((t) => t.slug === slug),
    getTools: () => tools,
  };
};
