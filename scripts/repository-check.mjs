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
  'packages/flowtract/package.json',
  'packages/create-flowtract/package.json'
];

const forbiddenRoots = ['.gap', '.vscode', 'data', 'features', 'mock-server', 'src', 'reports'];

const forbiddenDependencies = [
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
  'repository:check',
  'secret:check',
  'clean-clone:check',
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
for (const path of packagePaths) {
  const value = JSON.parse(await readFile(join(root, path), 'utf8'));
  if (value.private !== true) {
    throw new Error(`Package must remain private during Gate 2: ${path}`);
  }
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

console.log(
  `Repository boundary passed: ${requiredPaths.length} required paths, ${forbiddenRoots.length} forbidden roots, and ${sourceFiles.length} source files checked.`
);
