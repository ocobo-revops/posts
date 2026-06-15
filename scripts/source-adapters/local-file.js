import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const KEY_VALUE_RE = /^([\w-]+):\s*(.+)$/;
const MIN_KV_LINES = 2;

const parseKeyValueBlock = (lines) => {
  const fields = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const m = lines[i].match(KEY_VALUE_RE);
    if (!m) break;
    const [, key, val] = m;
    fields[key] = val.trim();
  }
  const body = lines.slice(i).join('\n').trim();
  return { fields, body };
};

export const parseContent = (raw) => {
  // Strategy 1: YAML frontmatter between --- delimiters
  const parsed = matter(raw);
  if (Object.keys(parsed.data).length > 0) {
    return { fields: parsed.data, body: parsed.content.trim() };
  }

  // Strategy 2: flat key: value lines (≥2 matches in the first 10 lines)
  const lines = raw.split('\n');
  const leadingKvCount = lines
    .slice(0, 10)
    .filter((l) => KEY_VALUE_RE.test(l)).length;
  if (leadingKvCount >= MIN_KV_LINES) {
    return parseKeyValueBlock(lines);
  }

  // Strategy 3: prose — entire content becomes the body
  return { fields: {}, body: raw.trim() };
};

export const readLocalFile = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return parseContent(raw);
};

// CLI entrypoint: node scripts/source-adapters/local-file.js <path>
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node scripts/source-adapters/local-file.js <path>');
    process.exit(1);
  }
  const result = await readLocalFile(filePath);
  console.log(JSON.stringify(result, null, 2));
}
