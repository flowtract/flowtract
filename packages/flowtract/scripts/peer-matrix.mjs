import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { esmRuntime, packageJson } from './consumer-fixture.mjs';
import { createConsumer, installConsumer, runNode, runNpm } from './package-tools.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-peers-'));
const profiles = [
  { name: 'minimum', zod: '4.0.0', playwright: '1.62.0' },
  { name: 'latest-reviewed', zod: '4.4.3', playwright: '1.62.1' }
];

try {
  const output = runNpm(['pack', '--json', '--pack-destination', temporaryRoot], {
    cwd: packageRoot,
    capture: true
  });
  const [archive] = JSON.parse(output);
  if (archive === undefined) throw new Error('npm pack did not report a peer archive.');
  const tarball = path.join(temporaryRoot, archive.filename);

  for (const profile of profiles) {
    const consumer = path.join(temporaryRoot, profile.name);
    await createConsumer(consumer, {
      'package.json': packageJson,
      'consumer.mjs': esmRuntime
    });
    installConsumer(consumer, tarball, profile);
    runNode([path.join(consumer, 'consumer.mjs')], { cwd: consumer });
    try {
      await readFile(path.join(consumer, 'node_modules', '@cucumber', 'cucumber', 'package.json'));
      throw new Error(`${profile.name} peer consumer unexpectedly installed Cucumber.`);
    } catch (error) {
      if (error instanceof Error && !('code' in error && error.code === 'ENOENT')) throw error;
    }
    console.log(
      `${profile.name} peers passed: Zod ${profile.zod}, Playwright ${profile.playwright}.`
    );
  }

  const missing = path.join(temporaryRoot, 'missing-peers');
  await createConsumer(missing, {
    'package.json': packageJson,
    'consumer.mjs': `import 'flowtract';\n`
  });
  runNpm(
    [
      'install',
      '--ignore-scripts',
      '--omit=peer',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      tarball
    ],
    { cwd: missing }
  );
  let missingFailed = false;
  try {
    runNode([path.join(missing, 'consumer.mjs')], { cwd: missing, capture: true });
  } catch (error) {
    missingFailed =
      error instanceof Error && /playwright|zod|ERR_MODULE_NOT_FOUND/iu.test(String(error));
  }
  if (!missingFailed) throw new Error('Missing peer execution did not fail actionably.');

  const unsupported = path.join(temporaryRoot, 'unsupported-peer');
  await createConsumer(unsupported, { 'package.json': packageJson });
  let unsupportedFailed = false;
  try {
    runNpm(
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--no-package-lock',
        tarball,
        'zod@3.25.76',
        'playwright@1.62.0'
      ],
      { cwd: unsupported, capture: true }
    );
  } catch {
    unsupportedFailed = true;
  }
  if (!unsupportedFailed) throw new Error('Unsupported Zod peer did not fail installation.');
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
