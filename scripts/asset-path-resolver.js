const ASSET_PATHS = {
  'blog-post': (slug) => `assets/posts/${slug}`,
  'team-member': (slug) => `assets/team/${slug}`,
  story: (slug, variant) =>
    variant ? `assets/clients/${slug}-${variant}` : `assets/clients/${slug}`,
  tool: (slug) => `assets/tools/${slug}`,
  job: (slug) => `assets/jobs/${slug}`,
};

/**
 * Returns the canonical relative asset path for a content type + slug.
 * @param {'blog-post'|'team-member'|'story'|'tool'|'job'} type
 * @param {string} slug
 * @param {string} [variant] - for stories: 'avatar'|'color'|'dark'|'white'
 */
export const resolveAssetPath = (type, slug, variant) => {
  const resolver = ASSET_PATHS[type];
  if (!resolver) throw new Error(`Unknown content type: ${type}`);
  return resolver(slug, variant);
};
