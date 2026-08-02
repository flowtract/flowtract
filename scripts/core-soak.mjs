import { execFileSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (npmCli === undefined) throw new Error('npm_execpath is required for soak proof.');
const profile = process.argv[2] === '--smoke' ? 'smoke' : 'acceptance';
if (process.argv.length > (profile === 'smoke' ? 3 : 2)) {
  throw new Error('core:soak does not accept duration or threshold overrides.');
}
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-soak-'));

function runNode(arguments_, options = {}) {
  return execFileSync(process.execPath, arguments_, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: options.env ?? process.env
  });
}

function npm(arguments_, options = {}) {
  return runNode([npmCli, ...arguments_], options);
}

try {
  npm(['run', 'build']);
  const packOutput = npm(
    ['pack', '--workspace', 'flowtract', '--json', '--pack-destination', temporaryRoot],
    { capture: true }
  );
  const [archive] = JSON.parse(packOutput);
  if (archive === undefined) throw new Error('npm pack did not report a soak archive.');
  const consumer = path.join(temporaryRoot, 'consumer');
  await mkdir(consumer, { recursive: true });
  await writeFile(
    path.join(consumer, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
    'utf8'
  );
  await copyFile(
    path.join(root, 'scripts', 'fixtures', 'soak-consumer.mjs'),
    path.join(consumer, 'soak.mjs')
  );
  npm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      path.join(temporaryRoot, archive.filename),
      'zod@4.4.3',
      'playwright@1.62.1'
    ],
    { cwd: consumer }
  );
  const sha = execFileSync(
    'git',
    ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'rev-parse', 'HEAD'],
    { cwd: root, encoding: 'utf8' }
  ).trim();
  const output = runNode(['--expose-gc', 'soak.mjs'], {
    cwd: consumer,
    capture: true,
    env: {
      ...process.env,
      FLOWTRACT_CANDIDATE_SHA: sha,
      FLOWTRACT_SOAK_PROFILE: profile
    }
  });
  const line = output.split(/\r?\n/u).find(candidate => candidate.startsWith('FLOWTRACT_SOAK '));
  if (line === undefined) throw new Error('Soak consumer did not emit a report.');
  const report = JSON.parse(line.slice('FLOWTRACT_SOAK '.length));
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const reportPath = process.env.FLOWTRACT_SOAK_REPORT;
  if (reportPath !== undefined) await writeFile(reportPath, serialized, 'utf8');
  process.stdout.write(serialized);
  if (report.verdict !== 'passed') process.exitCode = 1;
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
