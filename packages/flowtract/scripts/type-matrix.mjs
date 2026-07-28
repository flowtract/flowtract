import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageJson, tsconfigEsm, typescriptEsm } from './consumer-fixture.mjs';
import {
  createConsumer,
  installConsumer,
  runConsumerTypeScript,
  runNpm
} from './package-tools.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-types-'));
const versions = ['5.5.4', '6.0.2', '7.0.2'];

try {
  const packOutput = runNpm(['pack', '--json', '--pack-destination', temporaryRoot], {
    cwd: packageRoot,
    capture: true
  });
  const [archive] = JSON.parse(packOutput);
  if (archive === undefined) {
    throw new Error('npm pack did not report an archive.');
  }
  const tarball = path.join(temporaryRoot, archive.filename);

  for (const version of versions) {
    const consumer = path.join(temporaryRoot, `typescript-${version}`);
    await createConsumer(consumer, {
      'package.json': packageJson,
      'consumer.ts': typescriptEsm,
      'tsconfig.json': tsconfigEsm
    });
    installConsumer(consumer, tarball, version);
    runConsumerTypeScript(consumer);
    console.log(`TypeScript ${version} consumer passed.`);
  }
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
