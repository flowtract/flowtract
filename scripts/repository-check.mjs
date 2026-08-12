import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const requiredPaths = [
  'LICENSE',
  'NOTICE',
  'SECURITY.md',
  'GOVERNANCE.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'DEVELOPERS_CERTIFICATE_OF_ORIGIN.txt',
  'docs/open-source/v0.1/README.md',
  '.github/workflows/gate3-acceptance.yml',
  '.github/workflows/release-rehearsal.yml',
  '.github/workflows/release.yml',
  '.github/workflows/pages.yml',
  'release/flowtract-0.1.json',
  'release/package-files.json',
  'release/root-exports.json',
  'docs/site/index.md',
  'docs/site/evaluate.md',
  'docs/open-source/v0.1/gate-4b/evidence-ledger.md',
  '.github/ISSUE_TEMPLATE/gate4b-evaluation.yml',
  'examples/market-gap/authenticated-workflow.mjs',
  'packages/flowtract/package.json',
  'packages/create-flowtract/package.json'
];

const forbiddenRoots = ['.gap', '.vscode', 'data', 'features', 'mock-server', 'src', 'reports'];

const forbiddenDependencies = [
  '@cucumber/cucumber',
  '@playwright/test',
  '@types/jsonpath',
  'cucumber-html-reporter',
  'dotenv',
  'jsonpath',
  'ts-node'
];

const expectedScripts = [
  'format:check',
  'lint',
  'type-check',
  'test',
  'coverage',
  'build',
  'package:check',
  'type-matrix',
  'peer-matrix',
  'repository:check',
  'secret:check',
  'clean-clone:check',
  'core:stress',
  'core:benchmark',
  'core:benchmark:compare',
  'core:soak:smoke',
  'core:soak',
  'docs:check',
  'api-docs:check',
  'sbom:check',
  'package:publish-dry-run',
  'package:publish-dry-run:built',
  'release:contract:check',
  'release:self-test',
  'release:rehearse',
  'release:registry:check',
  'market-proof:check',
  'docs:site:check',
  'gate4b:check',
  'gate4:qa',
  'gate3:qa',
  'gate2:qa',
  'qa'
];

async function exists(path) {
  try {
    await stat(join(root, path));
    return true;
  } catch {
    return false;
  }
}

for (const path of requiredPaths) {
  if (!(await exists(path))) {
    throw new Error(`Required repository path is missing: ${path}`);
  }
}

for (const path of forbiddenRoots) {
  if (await exists(path)) {
    throw new Error(`Legacy repository path must not exist: ${path}`);
  }
}

const rootPackage = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const packagePaths = [
  'package.json',
  'packages/flowtract/package.json',
  'packages/create-flowtract/package.json'
];
if (rootPackage.private !== true) {
  throw new Error('The workspace root must remain private.');
}
const createPackage = JSON.parse(
  await readFile(join(root, 'packages/create-flowtract/package.json'), 'utf8')
);
if (createPackage.private !== true) {
  throw new Error('create-flowtract must remain private during Gate 4A.');
}

for (const script of expectedScripts) {
  if (typeof rootPackage.scripts?.[script] !== 'string') {
    throw new Error(`Required root script is missing: ${script}`);
  }
}

const dependencyNames = new Set([
  ...Object.keys(rootPackage.dependencies ?? {}),
  ...Object.keys(rootPackage.devDependencies ?? {}),
  ...Object.keys(rootPackage.optionalDependencies ?? {})
]);
for (const dependency of forbiddenDependencies) {
  if (dependencyNames.has(dependency)) {
    throw new Error(`Legacy root dependency must not exist: ${dependency}`);
  }
}

const flowtractPackage = JSON.parse(
  await readFile(join(root, 'packages/flowtract/package.json'), 'utf8')
);
const flowtractExports = Object.keys(flowtractPackage.exports ?? {});
if (flowtractExports.length !== 1 || flowtractExports[0] !== '.') {
  throw new Error('The flowtract package must expose only its root entry point.');
}
if (flowtractPackage.bin !== undefined) {
  throw new Error('The flowtract package must not expose a CLI binary during Gate 4A.');
}
if (
  flowtractPackage.version !== '0.1.0' ||
  flowtractPackage.private !== undefined ||
  flowtractPackage.publishConfig?.access !== 'public' ||
  flowtractPackage.publishConfig?.provenance !== true
) {
  throw new Error('The flowtract package must match the Gate 4A public metadata contract.');
}

for (const path of packagePaths) {
  const value = JSON.parse(await readFile(join(root, path), 'utf8'));
  const allDependencies = new Set([
    ...Object.keys(value.dependencies ?? {}),
    ...Object.keys(value.devDependencies ?? {}),
    ...Object.keys(value.optionalDependencies ?? {}),
    ...Object.keys(value.peerDependencies ?? {})
  ]);
  if (allDependencies.has('@cucumber/cucumber')) {
    throw new Error(`Cucumber coupling must not exist during Gate 3: ${path}`);
  }
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['.git', 'node_modules', 'dist', 'coverage', 'flowtract-results'].includes(entry.name)) {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }
  return files;
}

const sourceFiles = (await collectFiles(join(root, 'packages', 'flowtract', 'src'))).filter(path =>
  path.endsWith('.ts')
);
for (const path of sourceFiles) {
  const content = await readFile(path, 'utf8');
  if (content.includes('_def')) {
    throw new Error(`Private Zod API reference found: ${relative(root, path)}`);
  }
}

if (await exists('data/parts.json')) {
  throw new Error('Protected prototype fixture must not exist in Flowtract.');
}

const generatedEvidence = (await collectFiles(root))
  .map(path => relative(root, path).replaceAll('\\', '/'))
  .filter(path => /(^|\/)(?:sbom|bom)(?:[.-].*)?\.(?:json|xml)$/iu.test(path));
if (generatedEvidence.length > 0) {
  throw new Error(`Generated SBOM evidence must remain untracked: ${generatedEvidence.join(', ')}`);
}

const acceptanceWorkflow = await readFile(
  join(root, '.github/workflows/gate3-acceptance.yml'),
  'utf8'
);
for (const required of [
  'expected_sha:',
  'npm run core:benchmark:compare',
  'npm run core:soak',
  '043fb46d1a93c77aae656e7c1c64a875d1fc6a0a'
]) {
  if (!acceptanceWorkflow.includes(required)) {
    throw new Error(`Gate 3 acceptance workflow is missing: ${required}`);
  }
}

console.log(
  `Repository boundary passed: ${requiredPaths.length} required paths, ${forbiddenRoots.length} forbidden roots, and ${sourceFiles.length} source files checked.`
);
