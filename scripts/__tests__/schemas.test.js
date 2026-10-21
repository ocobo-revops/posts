import { describe, expect, it } from 'vitest';
import { validateBlogPost } from '../schemas/blog-post.schema.js';
import { validateJob } from '../schemas/job.schema.js';
import { validateStory } from '../schemas/story.schema.js';
import { validateTeamMember } from '../schemas/team-member.schema.js';
import { validateTool } from '../schemas/tool.schema.js';

// ── tool ──────────────────────────────────────────────────────────────────────

describe('tool schema', () => {
  it('accepts a valid tool', () => {
    expect(validateTool({ name: 'HubSpot', category: 'CRM' }).success).toBe(true);
  });

  it('accepts a tool with iconUrl', () => {
    expect(
      validateTool({ name: 'HubSpot', category: 'CRM', iconUrl: 'https://example.com/icon.svg' }).success,
    ).toBe(true);
  });

  it('rejects missing name', () => {
    expect(validateTool({ category: 'CRM' }).success).toBe(false);
  });

  it('rejects missing category', () => {
    expect(validateTool({ name: 'HubSpot' }).success).toBe(false);
  });

  it('rejects invalid iconUrl', () => {
    expect(validateTool({ name: 'HubSpot', category: 'CRM', iconUrl: 'not-a-url' }).success).toBe(false);
  });
});

// ── team member ───────────────────────────────────────────────────────────────

const validMember = {
  name: 'Alice',
  role: { fr: 'Associée', en: 'Partner' },
  track: 'architect',
  avatar: 'https://example.com/alice.jpg',
  bio: { fr: 'Bio FR', en: 'Bio EN' },
  displayOrder: 1,
};

describe('team-member schema', () => {
  it('accepts a valid team member', () => {
    expect(validateTeamMember(validMember).success).toBe(true);
  });

  it('accepts optional fields', () => {
    expect(
      validateTeamMember({ ...validMember, linkedin: 'https://linkedin.com/in/alice', displayOrder: 1, active: true, color: 'coral' }).success,
    ).toBe(true);
  });

  it('rejects missing displayOrder', () => {
    const { displayOrder, ...withoutOrder } = validMember;
    expect(validateTeamMember(withoutOrder).success).toBe(false);
  });

  it('rejects missing role.en', () => {
    expect(validateTeamMember({ ...validMember, role: { fr: 'Associée' } }).success).toBe(false);
  });

  it('rejects missing bio.fr', () => {
    expect(validateTeamMember({ ...validMember, bio: { en: 'Bio EN' } }).success).toBe(false);
  });

  it('rejects invalid color', () => {
    expect(validateTeamMember({ ...validMember, color: 'blue' }).success).toBe(false);
  });

  it('rejects invalid avatar url', () => {
    expect(validateTeamMember({ ...validMember, avatar: 'not-a-url' }).success).toBe(false);
  });
});

describe('team-member expert fields', () => {
  const expert = {
    ...validMember,
    enjeu: 'sc',
    contribution: { fr: 'Contribution', en: 'Contribution EN' },
    tools: ['hubspot', 'qobra'],
    previousCompanies: ['Qonto'],
  };
  const fails = (data) => validateTeamMember(data).success === false;
  const messages = (data) => validateTeamMember(data).error.issues.map((i) => i.message);

  it('accepts a member without any expert field', () => {
    expect(validateTeamMember(validMember).success).toBe(true);
  });

  it('accepts a member with all four expert fields', () => {
    expect(validateTeamMember(expert).success).toBe(true);
  });

  it('accepts every enjeu key', () => {
    for (const enjeu of ['rp', 'se', 'sc', 'cx', 'sy', 'ai']) {
      expect(validateTeamMember({ ...expert, enjeu }).success).toBe(true);
    }
  });

  it('rejects an unknown enjeu key', () => {
    expect(fails({ ...expert, enjeu: 'xx' })).toBe(true);
  });

  it('rejects enjeu without contribution', () => {
    const { contribution, ...rest } = expert;
    expect(fails(rest)).toBe(true);
    expect(messages(rest)).toContain('contribution is required when enjeu is set');
  });

  it('rejects enjeu without tools', () => {
    const { tools, ...rest } = expert;
    expect(fails(rest)).toBe(true);
    expect(messages(rest)).toContain('tools is required when enjeu is set');
  });

  it('accepts enjeu without previousCompanies', () => {
    const { previousCompanies, ...rest } = expert;
    expect(validateTeamMember(rest).success).toBe(true);
  });

  it('accepts contribution, tools and previousCompanies without enjeu', () => {
    const { enjeu, ...rest } = expert;
    expect(validateTeamMember(rest).success).toBe(true);
  });

  it('caps contribution at 100 characters per language', () => {
    const ok = 'x'.repeat(100);
    const tooLong = 'x'.repeat(101);
    expect(validateTeamMember({ ...expert, contribution: { fr: ok, en: ok } }).success).toBe(true);
    expect(fails({ ...expert, contribution: { fr: tooLong, en: ok } })).toBe(true);
    expect(fails({ ...expert, contribution: { fr: ok, en: tooLong } })).toBe(true);
  });

  it('rejects a contribution missing a language', () => {
    expect(fails({ ...expert, contribution: { fr: 'Contribution' } })).toBe(true);
  });

  it('accepts 1 to 8 tools and rejects 0 or 9', () => {
    const slugs = (n) => Array.from({ length: n }, (_, i) => `tool-${i}`);
    expect(validateTeamMember({ ...expert, tools: slugs(1) }).success).toBe(true);
    expect(validateTeamMember({ ...expert, tools: slugs(8) }).success).toBe(true);
    expect(fails({ ...expert, tools: [] })).toBe(true);
    expect(fails({ ...expert, tools: slugs(9) })).toBe(true);
  });

  it('rejects duplicate tools', () => {
    expect(fails({ ...expert, tools: ['hubspot', 'hubspot'] })).toBe(true);
  });

  it('accepts 1 to 3 previous companies and rejects 0 or 4', () => {
    expect(validateTeamMember({ ...expert, previousCompanies: ['A', 'B', 'C'] }).success).toBe(true);
    expect(fails({ ...expert, previousCompanies: [] })).toBe(true);
    expect(fails({ ...expert, previousCompanies: ['A', 'B', 'C', 'D'] })).toBe(true);
  });

  it('caps a previous company name at 30 characters', () => {
    expect(validateTeamMember({ ...expert, previousCompanies: ['x'.repeat(30)] }).success).toBe(true);
    expect(fails({ ...expert, previousCompanies: ['x'.repeat(31)] })).toBe(true);
  });
});

// ── blog post ─────────────────────────────────────────────────────────────────

const validPost = {
  title: 'My post',
  author: 'alice',
  description: 'A post',
  date: '2024-01-15',
  image: 'https://example.com/cover.jpg',
};

describe('blog-post schema', () => {
  it('accepts a valid blog post', () => {
    expect(validateBlogPost(validPost).success).toBe(true);
  });

  it('coerces JS Date to iso string', () => {
    expect(validateBlogPost({ ...validPost, date: new Date('2024-01-15') }).success).toBe(true);
  });

  it('accepts optional fields', () => {
    expect(
      validateBlogPost({ ...validPost, read: '4 min', tags: ['strategy'], exerpt: 'A short excerpt' }).success,
    ).toBe(true);
  });

  it('rejects invalid date format', () => {
    expect(validateBlogPost({ ...validPost, date: '15/01/2024' }).success).toBe(false);
  });

  it('rejects invalid image url', () => {
    expect(validateBlogPost({ ...validPost, image: 'not-a-url' }).success).toBe(false);
  });

  it('rejects missing author', () => {
    const { author: _, ...noAuthor } = validPost;
    expect(validateBlogPost(noAuthor).success).toBe(false);
  });
});

// ── story ─────────────────────────────────────────────────────────────────────

const validStory = {
  name: 'Acme',
  date: '2024-03-01',
  title: 'Acme story',
  subtitle: 'How Acme did it',
  description: 'Full description',
  speaker: 'Jean Dupont',
  role: 'CRO',
  duration: '6 mois',
  scopes: ['Acquisition'],
  tools: ['hubspot', 'gsheet'],
  featuredTool: 'hubspot',
};

describe('story schema', () => {
  it('accepts a valid story', () => {
    expect(validateStory(validStory).success).toBe(true);
  });

  it('accepts optional quotes and deliverables', () => {
    expect(
      validateStory({ ...validStory, quotes: ['Great!'], deliverables: ['Audit'] }).success,
    ).toBe(true);
  });

  it('rejects featuredTool not in tools[]', () => {
    expect(validateStory({ ...validStory, featuredTool: 'salesforce' }).success).toBe(false);
  });

  it('coerces JS Date in date field', () => {
    expect(validateStory({ ...validStory, date: new Date('2024-03-01') }).success).toBe(true);
  });

  it('rejects missing tools array', () => {
    const { tools: _, ...noTools } = validStory;
    expect(validateStory(noTools).success).toBe(false);
  });
});

// ── job ───────────────────────────────────────────────────────────────────────

const validJob = {
  title: 'RevOps Manager',
  contractType: 'CDI',
  seniority: '3-5 ans',
  location: 'Paris',
  startDate: '2024-09-01',
  hiringContact: 'alice',
  tallyFormId: 'abc123',
  status: 'published',
  publishedAt: '2024-08-01',
};

describe('job schema', () => {
  it('accepts a valid job', () => {
    expect(validateJob(validJob).success).toBe(true);
  });

  it('accepts optional icon and applyEmail', () => {
    expect(
      validateJob({ ...validJob, icon: '🚀', applyEmail: 'jobs@example.com' }).success,
    ).toBe(true);
  });

  it('coerces JS Date in startDate and publishedAt', () => {
    expect(
      validateJob({ ...validJob, startDate: new Date('2024-09-01'), publishedAt: new Date('2024-08-01') }).success,
    ).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(validateJob({ ...validJob, status: 'active' }).success).toBe(false);
  });

  it('rejects invalid applyEmail', () => {
    expect(validateJob({ ...validJob, applyEmail: 'not-an-email' }).success).toBe(false);
  });

  it('rejects missing startDate', () => {
    const { startDate: _, ...noDate } = validJob;
    expect(validateJob(noDate).success).toBe(false);
  });
});
