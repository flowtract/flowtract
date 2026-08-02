import { execFileSync } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (npmCli === undefined) throw new Error('npm_execpath is required for benchmark proof.');
const compare = process.argv.includes('--compare');
const baselineSha = 'cc30efec286c595d185644096fe8a17c0771591d';
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-benchmark-'));

function run(command, arguments_, options = {}) {
  return execFileSync(command, arguments_, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' }
  });
}

function npm(arguments_, options = {}) {
  return run(process.execPath, [npmCli, ...arguments_], options);
}

async function pack(repository, destination) {
  npm(['run', 'build'], { cwd: repository });
  const output = npm(
    ['pack', '--workspace', 'flowtract', '--json', '--pack-destination', destination],
    { cwd: repository, capture: true }
  );
  const [archive] = JSON.parse(output);
  if (archive === undefined) throw new Error('npm pack did not report a benchmark archive.');
  return path.join(destination, archive.filename);
}

async function measure(name, tarball) {
  const consumer = path.join(temporaryRoot, `consumer-${name}`);
  await mkdir(consumer, { recursive: true });
  await writeFile(
    path.join(consumer, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
    'utf8'
  );
  await copyFile(
    path.join(root, 'scripts', 'fixtures', 'benchmark-consumer.mjs'),
    path.join(consumer, 'benchmark.mjs')
  );
  npm(
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      tarball,
      'zod@4.4.3',
      'playwright@1.62.1'
    ],
    { cwd: consumer }
  );
  const output = run(process.execPath, ['benchmark.mjs'], { cwd: consumer, capture: true });
  const line = output
    .split(/\r?\n/u)
    .find(candidate => candidate.startsWith('FLOWTRACT_BENCHMARK '));
  if (line === undefined) throw new Error(`${name} benchmark did not produce a result.`);
  return JSON.parse(line.slice('FLOWTRACT_BENCHMARK '.length));
}

try {
  const candidateArchive = await pack(root, temporaryRoot);
  const candidate = await measure('candidate', candidateArchive);
  if (candidate.medianMs >= 10_000) {
    throw new Error(`Candidate benchmark median exceeded 10 seconds (${candidate.medianMs}ms).`);
  }

  const report = {
    schemaVersion: 1,
    candidateSha: run(
      'git',
      ['-c', `safe.directory=${root.replaceAll('\\', '/')}`, 'rev-parse', 'HEAD'],
      {
        capture: true
      }
    ).trim(),
    os: `${process.platform}-${process.arch}`,
    node: process.version,
    candidate,
    ...(compare
      ? await (async () => {
          const baseline = path.join(temporaryRoot, 'gate2-baseline');
          run('git', [
            '-c',
            `safe.directory=${root.replaceAll('\\', '/')}`,
            'clone',
            '--quiet',
            '--no-hardlinks',
            root,
            baseline
          ]);
          run('git', ['checkout', '--quiet', baselineSha], { cwd: baseline });
          npm(['ci', '--ignore-scripts'], { cwd: baseline });
          const baselineArchive = await pack(baseline, temporaryRoot);
          const baselineResult = await measure('baseline', baselineArchive);
          const ratio = candidate.medianMs / baselineResult.medianMs;
          if (ratio > 1.2) {
            throw new Error(`Candidate benchmark regressed by ${((ratio - 1) * 100).toFixed(2)}%.`);
          }
          return { baselineSha, baseline: baselineResult, ratio };
        })()
      : {}),
    verdict: 'passed'
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const evidencePath = process.env.FLOWTRACT_BENCHMARK_REPORT;
  if (evidencePath !== undefined) await writeFile(evidencePath, serialized, 'utf8');
  process.stdout.write(serialized);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
