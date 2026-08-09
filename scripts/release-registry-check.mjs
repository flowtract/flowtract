import { mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  cjsRuntime,
  esmRuntime,
  packageJson,
  tsconfigCjs,
  tsconfigEsm,
  typescriptCjs,
  typescriptEsm
} from '../packages/flowtract/scripts/consumer-fixture.mjs';
import {
  createConsumer,
  runConsumerTypeScript,
  runNode,
  runNpm
} from '../packages/flowtract/scripts/package-tools.mjs';
import {
  fetchPackageMetadata,
  parseArguments,
  readJson,
  readReleaseContract,
  repositoryRoot,
  validatePackageOwnership,
  validateSignatureProof
} from './release-lib.mjs';

async function collect(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory())
      files.push(...(await collect(path.join(directory, entry.name), relative)));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

const arguments_ = parseArguments(process.argv.slice(2));
const contract = await readReleaseContract();
const evidence =
  arguments_.get('evidence') === undefined
    ? undefined
    : await readJson(path.resolve(arguments_.get('evidence')));
const version = evidence?.version ?? arguments_.get('version');
if (![contract.bootstrap.version, contract.final.version].includes(version)) {
  throw new Error('--version must be the reviewed bootstrap or final version.');
}
const registry = arguments_.get('registry') ?? contract.registry;
const expectedIntegrity = evidence?.integrity ?? arguments_.get('expected-integrity');
const metadata = await fetchPackageMetadata(registry, contract.package);
validatePackageOwnership(metadata, contract.package, contract.owners);
const published = metadata.versions?.[version];
if (published === undefined) throw new Error(`Registry version ${version} does not exist.`);
if (published.repository?.url !== contract.repository) {
  throw new Error('Published repository URL differs from the release contract.');
}
if (expectedIntegrity !== undefined && published.dist?.integrity !== expectedIntegrity) {
  throw new Error('Published integrity differs from the accepted rehearsal.');
}

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-registry-consumer-'));
try {
  const consumer = path.join(temporaryRoot, 'consumer');
  await createConsumer(consumer, {
    'package.json': packageJson,
    'consumer.mjs': esmRuntime,
    'consumer.cjs': cjsRuntime,
    'consumer.ts': typescriptEsm,
    'consumer.cts': typescriptCjs,
    'tsconfig.esm.json': tsconfigEsm,
    'tsconfig.cjs.json': tsconfigCjs
  });
  runNpm(
    [
      'install',
      '--ignore-scripts',
      '--no-fund',
      '--no-package-lock',
      '--registry',
      registry,
      `${contract.package}@${version}`,
      'zod@4.4.3',
      'playwright@1.62.1',
      'typescript@6.0.2'
    ],
    { cwd: consumer }
  );
  const installedRoot = path.join(consumer, 'node_modules', contract.package);
  const files = (await collect(installedRoot)).sort();
  const expectedFiles = await readJson(path.join(repositoryRoot, 'release', 'package-files.json'));
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error('Installed registry files differ from the reviewed 84-file snapshot.');
  }
  runNode([path.join(consumer, 'consumer.mjs')], { cwd: consumer });
  runNode([path.join(consumer, 'consumer.cjs')], { cwd: consumer });
  runConsumerTypeScript(consumer, 'tsconfig.esm.json');
  runConsumerTypeScript(consumer, 'tsconfig.cjs.json');
  runNode([path.join(consumer, 'dist-esm', 'consumer.js')], { cwd: consumer });
  runNode([path.join(consumer, 'dist-cjs', 'consumer.cjs')], { cwd: consumer });
  const signatureProof = runNpm(['audit', 'signatures', '--registry', registry], {
    capture: true,
    cwd: consumer
  });
  validateSignatureProof(signatureProof);
  console.log(`Registry acceptance passed for flowtract@${version} with ${files.length} files.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
