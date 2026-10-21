import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateRepository } from './validate-repository.js';

const REPO_ROOT = join(fileURLToPath(import.meta.url), '../..');

const formatErrors = (issues) =>
  issues.map((i) => `  • ${i.path.join('.') || 'root'}: ${i.message}`).join('\n');

const run = () => {
  const { failures, assetErrors, assetWarnings } = validateRepository(REPO_ROOT);

  assetWarnings.forEach((w) => console.warn(`⚠️  ${w}`));

  if (failures.length === 0 && assetErrors.length === 0) {
    console.log('✓ All content valid');
    process.exit(0);
  }

  if (failures.length > 0) {
    console.error(`✗ ${failures.length} file(s) failed validation:\n`);
    for (const { file, schemaErrors, crossRefErrors } of failures) {
      console.error(`${file}`);
      if (schemaErrors.length > 0) console.error(formatErrors(schemaErrors));
      if (crossRefErrors.length > 0) console.error(formatErrors(crossRefErrors));
      console.error('');
    }
  }

  if (assetErrors.length > 0) {
    console.error(`✗ ${assetErrors.length} client asset issue(s):\n`);
    assetErrors.forEach((e) => console.error(`  • ${e}`));
    console.error('');
  }

  process.exit(1);
};

run();
