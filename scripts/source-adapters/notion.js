import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// ── Notion property extractors ────────────────────────────────────────────────

const EXTRACTORS = {
  title: (p) => p.title?.map((r) => r.plain_text).join('') ?? '',
  rich_text: (p) => p.rich_text?.map((r) => r.plain_text).join('') ?? '',
  select: (p) => p.select?.name ?? '',
  multi_select: (p) => p.multi_select?.map((o) => o.name) ?? [],
  date: (p) => p.date?.start ?? '',
  url: (p) => p.url ?? '',
  email: (p) => p.email ?? '',
  number: (p) => p.number ?? null,
  checkbox: (p) => p.checkbox ?? false,
  files: (p) =>
    p.files?.map((f) => f.file?.url ?? f.external?.url).filter(Boolean) ?? [],
};

const extractProp = (properties, ...aliases) => {
  for (const alias of aliases) {
    const prop = properties[alias];
    if (!prop) continue;
    const extractor = EXTRACTORS[prop.type];
    if (extractor) return extractor(prop);
  }
  return undefined;
};

// For fields that expect a single value but may come from a files/multi_select property
const extractSingle = (properties, ...aliases) => {
  const val = extractProp(properties, ...aliases);
  return Array.isArray(val) ? val[0] : val;
};

// ── Per-type property → field mappings ────────────────────────────────────────

const MAPPINGS = {
  'blog-post': (props) => ({
    title: extractProp(props, 'Title', 'Titre', 'Name'),
    author: extractProp(props, 'Author', 'Auteur'),
    description: extractProp(props, 'Description'),
    date: extractProp(props, 'Date'),
    image: extractSingle(props, 'Image', 'Cover', 'Couverture'),
    exerpt: extractProp(props, 'Exerpt', 'Excerpt', 'Résumé'),
    read: extractProp(props, 'Read', 'Reading time', 'Temps de lecture'),
    podcastId: extractProp(props, 'Podcast ID', 'PodcastId', 'Podcast'),
    tags: extractProp(props, 'Tags'),
    lang: extractProp(props, 'Lang', 'Language', 'Langue'),
  }),

  story: (props) => ({
    name: extractProp(props, 'Name', 'Client', 'Nom'),
    date: extractProp(props, 'Date'),
    title: extractProp(props, 'Title', 'Titre'),
    subtitle: extractProp(props, 'Subtitle', 'Sous-titre'),
    description: extractProp(props, 'Description'),
    speaker: extractProp(props, 'Speaker', 'Contact', 'Interlocuteur'),
    role: extractProp(props, 'Role', 'Rôle', 'Job title'),
    duration: extractProp(props, 'Duration', 'Durée'),
    scopes: extractProp(props, 'Scopes', 'Périmètres'),
    tools: extractProp(props, 'Tools', 'Outils'),
    featuredTool: extractSingle(props, 'Featured tool', 'Outil principal', 'Featured Tool'),
    quotes: extractProp(props, 'Quotes', 'Citations'),
    deliverables: extractProp(props, 'Deliverables', 'Livrables'),
    lang: extractProp(props, 'Lang', 'Language', 'Langue'),
  }),

  'team-member': (props) => ({
    name: extractProp(props, 'Name', 'Nom'),
    'role.fr': extractProp(props, 'Role FR', 'Rôle FR', 'Role (FR)'),
    'role.en': extractProp(props, 'Role EN', 'Role (EN)'),
    track: extractProp(props, 'Track'),
    avatar: extractSingle(props, 'Avatar', 'Photo'),
    'bio.fr': extractProp(props, 'Bio FR', 'Bio (FR)'),
    'bio.en': extractProp(props, 'Bio EN', 'Bio (EN)'),
    linkedin: extractProp(props, 'LinkedIn', 'Linkedin'),
    displayOrder: extractProp(props, 'Display order', 'Order', 'Ordre'),
    active: extractProp(props, 'Active'),
    featuredOnAboutUs: extractProp(props, 'Featured on about us', 'Featured'),
    color: extractProp(props, 'Color', 'Couleur'),
  }),

  tool: (props) => ({
    name: extractProp(props, 'Name', 'Nom'),
    category: extractProp(props, 'Category', 'Catégorie'),
    iconUrl: extractSingle(props, 'Icon URL', 'Icon', 'IconUrl'),
  }),

  job: (props) => ({
    title: extractProp(props, 'Title', 'Titre', 'Name'),
    icon: extractProp(props, 'Icon', 'Icône'),
    contractType: extractProp(props, 'Contract type', 'Type de contrat'),
    seniority: extractProp(props, 'Seniority', 'Séniorité'),
    location: extractProp(props, 'Location', 'Lieu'),
    startDate: extractProp(props, 'Start date', 'Date de début'),
    hiringContact: extractProp(props, 'Hiring contact', 'Contact RH'),
    applyEmail: extractProp(props, 'Apply email', 'Email candidature'),
    tallyFormId: extractProp(props, 'Tally form ID', 'TallyFormId'),
    status: extractProp(props, 'Status', 'Statut'),
    publishedAt: extractProp(props, 'Published at', 'Date de publication'),
    intro: extractProp(props, 'Intro'),
    lang: extractProp(props, 'Lang', 'Language', 'Langue'),
  }),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const compactFields = (fields) =>
  Object.fromEntries(
    Object.entries(fields).filter(([, v]) => {
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );

// Converts dot-notation keys (role.fr, bio.en) into nested objects
const nestFields = (flat) => {
  const result = {};
  for (const [key, value] of Object.entries(flat)) {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      result[parent] = { ...result[parent], [child]: value };
    } else {
      result[key] = value;
    }
  }
  return result;
};

// ── Public API ────────────────────────────────────────────────────────────────

export const extractAssets = (page) => {
  const assets = [];
  for (const [field, prop] of Object.entries(page.properties ?? {})) {
    if (prop.type === 'files') {
      for (const url of EXTRACTORS.files(prop)) {
        assets.push({ field, url });
      }
    }
  }
  return assets;
};

export const mapNotionPage = (page, type, body = '') => {
  const mapper = MAPPINGS[type];
  if (!mapper) throw new Error(`Unknown content type: ${type}`);

  const raw = mapper(page.properties ?? {});
  const fields = nestFields(compactFields(raw));
  const assets = extractAssets(page);

  return { fields, body: body.trim(), assets };
};

// ── CLI: node scripts/source-adapters/notion.js <page-json-path> <type> [body-path] ──

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const [, , pageJsonPath, type, bodyPath] = process.argv;
  if (!pageJsonPath || !type) {
    console.error(
      'Usage: node scripts/source-adapters/notion.js <page-json-path> <type> [body-path]',
    );
    process.exit(1);
  }
  try {
    const pageJson = await readFile(pageJsonPath, 'utf8');
    const page = JSON.parse(pageJson);
    const body = bodyPath ? await readFile(bodyPath, 'utf8') : '';
    const result = mapNotionPage(page, type, body);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
