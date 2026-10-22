import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { validateBlogPost } from './schemas/blog-post.schema.js';
import { validateChallenge } from './schemas/challenge.schema.js';
import { validateJob } from './schemas/job.schema.js';
import { validateStory } from './schemas/story.schema.js';
import { validateTeamMember } from './schemas/team-member.schema.js';
import { validateTool } from './schemas/tool.schema.js';
import { createResolver } from './cross-ref-resolver.js';
import { checkClientAssets } from './validate-client-assets.js';

const VALIDATORS = {
  tool: { patterns: ['tools/*.md'], validate: validateTool },
  'team-member': { patterns: ['team/*.md'], validate: validateTeamMember },
  'blog-post': { patterns: ['blog/fr/*.md', 'blog/en/*.md'], validate: validateBlogPost },
  story: { patterns: ['stories/fr/*.md', 'stories/en/*.md'], validate: validateStory },
  job: { patterns: ['jobs/fr/*.md', 'jobs/en/*.md'], validate: validateJob },
  // Every challenge section is a frontmatter field, so a body would never render.
  challenge: {
    patterns: ['challenges/fr/*.md', 'challenges/en/*.md'],
    validate: validateChallenge,
    frontmatterOnly: true,
  },
};

// Cross-reference errors share the schema error shape ({ path, message }) so
// the CLI formats both the same way.
const validateCrossRefs = (type, data, resolver) => {
  const errors = [];
  if (type === 'blog-post' && data.author && !resolver.isValidTeamSlug(data.author)) {
    errors.push({ path: ['author'], message: `"${data.author}" does not match any team slug` });
  }
  if (type === 'story') {
    (data.tools ?? []).forEach((t) => {
      if (!resolver.isValidToolSlug(t)) {
        errors.push({ path: ['tools'], message: `"${t}" does not match any tool slug` });
      }
    });
    if (data.featuredTool && !resolver.isValidToolSlug(data.featuredTool)) {
      errors.push({
        path: ['featuredTool'],
        message: `"${data.featuredTool}" does not match any tool slug`,
      });
    }
  }
  if (type === 'team-member') {
    // A non-array `tools` is already a schema error; skip the cross-reference.
    const tools = Array.isArray(data.tools) ? data.tools.filter((t) => typeof t === 'string') : [];
    tools.forEach((t) => {
      if (!resolver.isValidToolSlug(t)) {
        errors.push({ path: ['tools'], message: `"${t}" does not match any tool slug` });
      }
    });
  }
  if (type === 'challenge') {
    // A malformed partner block is already a schema error; skip the cross-reference.
    // Trim as the schema does, so a padded slug resolves and a blank one is not reported twice.
    const tool = typeof data.partner?.tool === 'string' ? data.partner.tool.trim() : '';
    if (tool !== '' && !resolver.isValidToolSlug(tool)) {
      errors.push({ path: ['partner', 'tool'], message: `"${tool}" does not match any tool slug` });
    }
  }
  if (type === 'job' && data.hiringContact && !resolver.isValidTeamSlug(data.hiringContact)) {
    errors.push({
      path: ['hiringContact'],
      message: `"${data.hiringContact}" does not match any team slug`,
    });
  }
  return errors;
};

/**
 * Validates every content file under a repository root. Reads the files but
 * never prints and never exits: the caller decides how to report.
 *
 * @param {string} repoRoot
 * @returns {{
 *   failures: Array<{
 *     file: string,
 *     schemaErrors: Array<{ path: PropertyKey[], message: string }>,
 *     crossRefErrors: Array<{ path: PropertyKey[], message: string }>,
 *   }>,
 *   assetErrors: string[],
 *   assetWarnings: string[],
 * }}
 */
export const validateRepository = (repoRoot) => {
  const resolver = createResolver(repoRoot);
  const failures = [];
  const storySlugs = new Set();

  for (const [type, { patterns, validate, frontmatterOnly }] of Object.entries(VALIDATORS)) {
    for (const pattern of patterns) {
      const files = glob.sync(pattern, { cwd: repoRoot });
      for (const file of files) {
        const raw = readFileSync(join(repoRoot, file), 'utf8');
        const { data, content } = matter(raw);
        const slug = file.replace(/\.md$/, '').split('/').pop();
        if (type === 'story') storySlugs.add(slug);

        const result = validate(data);
        const schemaErrors = result.success ? [] : result.error.issues.map((i) => ({
          path: i.path, message: i.message,
        }));
        if (frontmatterOnly && content.trim() !== '') {
          schemaErrors.push({ path: [], message: 'markdown body must be empty, content lives in frontmatter' });
        }
        const crossRefErrors = validateCrossRefs(type, data, resolver);

        if (schemaErrors.length > 0 || crossRefErrors.length > 0) {
          failures.push({ file, schemaErrors, crossRefErrors });
        }
      }
    }
  }

  const { errors: assetErrors, warnings: assetWarnings } = checkClientAssets(
    repoRoot,
    [...storySlugs],
  );

  return { failures, assetErrors, assetWarnings };
};
