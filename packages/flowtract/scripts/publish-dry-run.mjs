import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from './package-tools.mjs';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-publish-'));

try {
  const candidate = path.join(temporaryRoot, 'package');
  await cp(packageRoot, candidate, {
    recursive: true,
    filter: source => !source.split(path.sep).includes('node_modules')
  });
  const tracked = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const rehearsal = structuredClone(tracked);
  delete rehearsal.private;
  await writeFile(
    path.join(candidate, 'package.json'),
    `${JSON.stringify(rehearsal, null, 2)}\n`,
    'utf8'
  );
  const reread = JSON.parse(await readFile(path.join(candidate, 'package.json'), 'utf8'));
  const trackedWithoutPrivate = structuredClone(tracked);
  delete trackedWithoutPrivate.private;
  if (JSON.stringify(reread) !== JSON.stringify(trackedWithoutPrivate)) {
    throw new Error('Publication rehearsal manifest changed fields other than private.');
  }

  const output = runNpm(['publish', '--dry-run', '--tag', 'next', '--json'], {
    cwd: candidate,
    capture: true
  });
  if (/private package|skipping publish/iu.test(output)) {
    throw new Error('npm skipped the publication rehearsal as private.');
  }
  const parsed = JSON.parse(output);
  const results = Array.isArray(parsed)
    ? parsed
    : parsed !== null && typeof parsed === 'object'
      ? Array.isArray(parsed.files)
        ? [parsed]
        : Object.values(parsed).filter(
            value => value !== null && typeof value === 'object' && Array.isArray(value.files)
          )
      : [];
  if (results.length !== 1) {
    throw new Error('Publication dry run must report exactly one package result.');
  }
  const [result] = results;
  if (!Array.isArray(result.files) || result.files.length !== 84) {
    throw new Error(
      `Publication dry run must report the reviewed 84 files, found ${result.files?.length ?? 0}.`
    );
  }
  for (const required of [
    'dist/types/esm/internal/safe-inspection.d.ts',
    'dist/types/esm/internal/safe-inspection.d.ts.map',
    'dist/types/cjs/internal/safe-inspection.d.cts',
    'dist/types/cjs/internal/safe-inspection.d.cts.map'
  ]) {
    if (!result.files.some(file => file.path === required)) {
      throw new Error(`Publication dry run is missing ${required}.`);
    }
  }
  console.log(`Publication dry run passed with ${result.files.length} reviewed files.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
