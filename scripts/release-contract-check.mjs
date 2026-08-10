import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { readJson, readReleaseContract, repositoryRoot } from './release-lib.mjs';

const contract = await readReleaseContract();
const packageManifest = await readJson(
  path.join(repositoryRoot, contract.packageRoot, 'package.json')
);
const rootManifest = await readJson(path.join(repositoryRoot, 'package.json'));
const deferredManifest = await readJson(
  path.join(repositoryRoot, 'packages', 'create-flowtract', 'package.json')
);
const files = await readJson(path.join(repositoryRoot, 'release', 'package-files.json'));
const exports = await readJson(path.join(repositoryRoot, 'release', 'root-exports.json'));

if (rootManifest.private !== true || deferredManifest.private !== true) {
  throw new Error('The workspace root and create-flowtract must remain private.');
}
if (
  packageManifest.name !== contract.package ||
  packageManifest.version !== contract.final.version ||
  packageManifest.private !== undefined ||
  packageManifest.repository?.url !== contract.repository ||
  packageManifest.publishConfig?.access !== 'public' ||
  packageManifest.publishConfig?.provenance !== true ||
  JSON.stringify(contract.owners) !== JSON.stringify(['iamprasanna-dev'])
) {
  throw new Error('Flowtract package metadata differs from the Gate 4A release contract.');
}
if (
  Object.keys(packageManifest.exports ?? {}).join(',') !== '.' ||
  packageManifest.bin !== undefined ||
  Object.keys(packageManifest.dependencies ?? {}).length !== 0
) {
  throw new Error('Gate 4A must remain root-only, binary-free, and production-dependency-free.');
}
if (files.length !== contract.archiveFiles || exports.length !== contract.rootExports) {
  throw new Error('Release snapshots do not have the approved sizes.');
}
for (const [label, values] of [
  ['package files', files],
  ['root exports', exports]
]) {
  if (
    new Set(values).size !== values.length ||
    JSON.stringify([...values].sort()) !== JSON.stringify(values)
  ) {
    throw new Error(`${label} snapshot must be unique and sorted.`);
  }
}

const workflowExpectations = new Map([
  [
    contract.releaseWorkflow,
    ['workflow_dispatch:', 'npm-bootstrap', 'npm-production', 'id-token: write']
  ],
  [
    contract.rehearsalWorkflow,
    ['workflow_dispatch:', 'expected_sha:', 'channel:', '8beda2b7ed98355c0e97c0a63bec38ae472e66c4']
  ],
  [
    contract.pagesWorkflow,
    ['workflow_dispatch:', 'github-pages', 'pages: write', 'id-token: write']
  ]
]);
for (const [file, expectedText] of workflowExpectations) {
  const source = await readFile(path.join(repositoryRoot, '.github', 'workflows', file), 'utf8');
  if (/\b(?:pull_request|schedule|workflow_call):/u.test(source)) {
    throw new Error(`${file} contains a forbidden release/deployment trigger.`);
  }
  for (const expected of expectedText) {
    if (!source.includes(expected)) throw new Error(`${file} is missing ${expected}.`);
  }
}

console.log(
  `Gate 4A release contract passed: ${exports.length} exports and ${files.length} package files.`
);
