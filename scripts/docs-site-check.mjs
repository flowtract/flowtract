import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(root, 'docs', 'site');
const required = [
  'index.md',
  'quick-start.md',
  'guide.md',
  'troubleshooting.md',
  'security.md',
  'market-proof.md',
  'feedback.md',
  'evaluate.md'
];
const sources = new Map();
for (const file of required) {
  const filePath = path.join(siteRoot, file);
  await access(filePath);
  const source = await readFile(filePath, 'utf8');
  sources.set(file, source);
  if (!source.startsWith('---\n') || !source.includes('\nlayout: default\n')) {
    throw new Error(`${file} is missing reviewed Jekyll front matter.`);
  }
  for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)) {
    const target = match[1];
    if (target === undefined || /^(?:https?:|#)/u.test(target)) continue;
    await access(path.resolve(siteRoot, target));
  }
}

const install = 'npm install flowtract@0.1.0 zod@^4 playwright@^1.62';
const packageReadme = await readFile(path.join(root, 'packages', 'flowtract', 'README.md'), 'utf8');
if (!sources.get('quick-start.md')?.includes(install) || !packageReadme.includes(install)) {
  throw new Error('The site and packed README installation commands differ.');
}
const allSiteText = [...sources.values()].join('\n').toLowerCase();
for (const claim of [
  'developer preview',
  'not a production-readiness',
  'collects no product telemetry'
]) {
  if (!allSiteText.includes(claim)) {
    throw new Error(`Documentation site is missing required claim: ${claim}`);
  }
}
console.log(`Documentation site proof passed with ${required.length} linked pages.`);
