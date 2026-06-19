import { readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

// Client logos/avatars are resolved by the website at
// `content/clients/<slug>-avatar.png` and `<slug>-white.png` with the `.png`
// extension HARDCODED — the story frontmatter carries no avatar field. A non-png
// asset (e.g. a .jpeg avatar) uploads to Blob fine but the site requests .png and
// 404s, rendering a broken image. validate-content has no frontmatter field to
// catch it, so these checks guard the asset directory directly.

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

// Pure: given a list of `assets/clients/` file paths, return the ones that are
// images but not `.png`. These are hard errors — the site can only find `.png`.
export const findNonPngClientAssets = (clientPaths) =>
  clientPaths.filter((p) => {
    const ext = extname(p).toLowerCase();
    return IMAGE_EXTS.has(ext) && ext !== '.png';
  });

// Pure: given story slugs and the set of existing `assets/clients/` basenames,
// return slugs whose expected `<slug>-avatar.png` is absent. These are warnings —
// some clients legitimately ship only a `-white` logo and no avatar.
export const findMissingStoryAvatars = (storySlugs, clientBasenames) => {
  const present = new Set(clientBasenames);
  return storySlugs.filter((slug) => !present.has(`${slug}-avatar.png`));
};

const listClientAssets = (rootDir) => {
  const dir = join(rootDir, 'assets', 'clients');
  try {
    return readdirSync(dir).filter((name) => IMAGE_EXTS.has(extname(name).toLowerCase()));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
};

// fs wrapper: returns { errors, warnings } string arrays for the CLI to surface.
export const checkClientAssets = (rootDir, storySlugs) => {
  const basenames = listClientAssets(rootDir);

  const errors = findNonPngClientAssets(basenames).map(
    (name) =>
      `assets/clients/${name}: client assets must be .png — the website resolves ` +
      `<slug>-avatar.png / <slug>-white.png with a hardcoded .png extension, so a ` +
      `non-png file 404s and renders broken. Transcode to PNG.`,
  );

  const warnings = findMissingStoryAvatars(storySlugs, basenames).map(
    (slug) =>
      `story "${slug}": no assets/clients/${slug}-avatar.png found — the speaker ` +
      `avatar will render broken unless this client ships no avatar by design.`,
  );

  return { errors, warnings };
};
