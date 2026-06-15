import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';
import matter from 'gray-matter';
import { validateBlogPost } from './schemas/blog-post.schema.js';
import { validateJob } from './schemas/job.schema.js';
import { validateStory } from './schemas/story.schema.js';
import { validateTeamMember } from './schemas/team-member.schema.js';
import { validateTool } from './schemas/tool.schema.js';
import { createResolver } from './cross-ref-resolver.js';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '../..');

const VALIDATORS = {
  tool: { patterns: ['tools/*.md'], validate: validateTool },
  'team-member': { patterns: ['team/*.md'], validate: validateTeamMember },
  'blog-post': { patterns: ['blog/fr/*.md', 'blog/en/*.md'], validate: validateBlogPost },
  story: { patterns: ['stories/fr/*.md', 'stories/en/*.md'], validate: validateStory },
  job: { patterns: ['jobs/fr/*.md', 'jobs/en/*.md'], validate: validateJob },
};

const formatErrors = (issues) =>
  issues.map((i) => `  • ${i.path.join('.') || 'root'}: ${i.message}`).join('\n');

const validateCrossRefs = (type, slug, data, resolver) => {
  const errors = [];
  if (type === 'blog-post' && data.author && !resolver.isValidTeamSlug(data.author)) {
    errors.push(`  • author: "${data.author}" does not match any team slug`);
  }
  if (type === 'story') {
    (data.tools ?? []).forEach((t) => {
      if (!resolver.isValidToolSlug(t)) errors.push(`  • tools: "${t}" does not match any tool slug`);
    });
    if (data.featuredTool && !resolver.isValidToolSlug(data.featuredTool)) {
      errors.push(`  • featuredTool: "${data.featuredTool}" does not match any tool slug`);
    }
  }
  if (type === 'job' && data.hiringContact && !resolver.isValidTeamSlug(data.hiringContact)) {
    errors.push(`  • hiringContact: "${data.hiringContact}" does not match any team slug`);
  }
  return errors;
};

const run = () => {
  const resolver = createResolver(REPO_ROOT);
  const failures = [];

  for (const [type, { patterns, validate }] of Object.entries(VALIDATORS)) {
    for (const pattern of patterns) {
      const files = glob.sync(pattern, { cwd: REPO_ROOT });
      for (const file of files) {
        const abs = join(REPO_ROOT, file);
        const raw = readFileSync(abs, 'utf8');
        const { data } = matter(raw);
        const slug = file.replace(/\.md$/, '').split('/').pop();

        const result = validate(data);
        const schemaErrors = result.success ? [] : result.error.issues.map((i) => ({
          path: i.path, message: i.message,
        }));
        const crossRefErrors = validateCrossRefs(type, slug, data, resolver);

        if (schemaErrors.length > 0 || crossRefErrors.length > 0) {
          failures.push({
            file: relative(REPO_ROOT, abs),
            schemaErrors,
            crossRefErrors,
          });
        }
      }
    }
  }

  if (failures.length === 0) {
    console.log('✓ All content valid');
    process.exit(0);
  }

  console.error(`✗ ${failures.length} file(s) failed validation:\n`);
  for (const { file, schemaErrors, crossRefErrors } of failures) {
    console.error(`${file}`);
    if (schemaErrors.length > 0) console.error(formatErrors(schemaErrors));
    crossRefErrors.forEach((e) => console.error(e));
    console.error('');
  }
  process.exit(1);
};

run();
