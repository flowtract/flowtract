import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cjsRuntime,
  esmRuntime,
  packageJson,
  tsconfigCjs,
  tsconfigEsm,
  typescriptCjs,
  typescriptEsm
} from './consumer-fixture.mjs';
import {
  createConsumer,
  installConsumer,
  runConsumerTypeScript,
  runNode,
  runNpm
} from './package-tools.mjs';

const startedAt = Date.now();
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-gate2-'));

try {
  const packOutput = runNpm(['pack', '--json', '--pack-destination', temporaryRoot], {
    cwd: packageRoot,
    capture: true
  });
  const [archive] = JSON.parse(packOutput);
  if (archive === undefined) {
    throw new Error('npm pack did not report an archive.');
  }
  if (archive.files.length !== 84) {
    throw new Error(
      `Package archive must contain exactly 84 reviewed files, found ${archive.files.length}.`
    );
  }

  const allowedRootFiles = new Set(['package.json', 'README.md', 'LICENSE', 'NOTICE']);
  const unexpectedFiles = archive.files
    .map(file => file.path)
    .filter(file => !allowedRootFiles.has(file) && !file.startsWith('dist/'));
  if (unexpectedFiles.length > 0) {
    throw new Error(`Package archive contains unexpected files: ${unexpectedFiles.join(', ')}`);
  }

  for (const required of [
    'dist/index.js',
    'dist/index.js.map',
    'dist/index.cjs',
    'dist/index.cjs.map',
    'dist/types/esm/index.d.ts',
    'dist/types/cjs/index.d.cts',
    'dist/types/esm/internal/safe-inspection.d.ts',
    'dist/types/esm/internal/safe-inspection.d.ts.map',
    'dist/types/cjs/internal/safe-inspection.d.cts',
    'dist/types/cjs/internal/safe-inspection.d.cts.map'
  ]) {
    if (!archive.files.some(file => file.path === required)) {
      throw new Error(`Package archive is missing ${required}.`);
    }
  }

  const tarball = path.join(temporaryRoot, archive.filename);
  runNpm(['exec', '--', 'publint', 'run', tarball, '--strict'], {
    cwd: packageRoot
  });
  runNpm(
    [
      'exec',
      '--',
      'attw',
      tarball,
      '--profile',
      'strict',
      '--entrypoints',
      '.',
      '--no-emoji',
      '--no-color'
    ],
    { cwd: packageRoot }
  );

  for (const file of archive.files.map(entry => entry.path).filter(file => file.endsWith('.map'))) {
    const sourceMap = JSON.parse(await readFile(path.join(packageRoot, file), 'utf8'));
    if (
      !Array.isArray(sourceMap.sourcesContent) ||
      sourceMap.sourcesContent.length !== sourceMap.sources.length
    ) {
      throw new Error(`${file} does not embed all source content.`);
    }
  }

  const consumer = path.join(temporaryRoot, 'clean-consumer');
  await createConsumer(consumer, {
    'package.json': packageJson,
    'consumer.mjs': esmRuntime,
    'consumer.cjs': cjsRuntime,
    'consumer.ts': typescriptEsm,
    'consumer.cts': typescriptCjs,
    'tsconfig.esm.json': tsconfigEsm,
    'tsconfig.cjs.json': tsconfigCjs
  });
  installConsumer(consumer, tarball, '7.0.2');
  runNode([path.join(consumer, 'consumer.mjs')], { cwd: consumer });
  runNode([path.join(consumer, 'consumer.cjs')], { cwd: consumer });
  runConsumerTypeScript(consumer, 'tsconfig.esm.json');
  runConsumerTypeScript(consumer, 'tsconfig.cjs.json');
  runNode([path.join(consumer, 'dist-esm', 'consumer.js')], { cwd: consumer });
  runNode([path.join(consumer, 'dist-cjs', 'consumer.cjs')], { cwd: consumer });
  try {
    await readFile(path.join(consumer, 'node_modules', '@cucumber', 'cucumber', 'package.json'));
    throw new Error('Packed consumer unexpectedly installed Cucumber.');
  } catch (error) {
    if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) throw error;
  }

  const durationMs = Date.now() - startedAt;
  if (durationMs >= 60_000) {
    throw new Error(`Package proof exceeded 60 seconds (${durationMs}ms).`);
  }
  console.log(
    `Flowtract package proof passed with ${archive.files.length} files in ${durationMs}ms.`
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
