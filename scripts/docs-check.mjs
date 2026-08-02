import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'packages', 'flowtract');
const npmCli = process.env.npm_execpath;
if (npmCli === undefined) throw new Error('npm_execpath is required for documentation proof.');
const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-docs-'));

function runNode(arguments_, options = {}) {
  return execFileSync(process.execPath, arguments_, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit'
  });
}

function npm(arguments_, options = {}) {
  return runNode([npmCli, ...arguments_], options);
}

try {
  if (process.env.FLOWTRACT_SKIP_BUILD !== '1') npm(['run', 'build']);
  const packOutput = npm(['pack', '--json', '--pack-destination', temporaryRoot], {
    cwd: packageRoot,
    capture: true
  });
  const [archive] = JSON.parse(packOutput);
  if (archive === undefined) throw new Error('npm pack did not report a documentation archive.');
  const consumer = path.join(temporaryRoot, 'consumer');
  await mkdir(consumer, { recursive: true });
  await writeFile(
    path.join(consumer, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
    'utf8'
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
      'playwright@1.62.1',
      'typescript@6.0.2'
    ],
    { cwd: consumer }
  );

  const readme = await readFile(
    path.join(consumer, 'node_modules', 'flowtract', 'README.md'),
    'utf8'
  );
  const expression = /```(js|ts) flowtract-example=(run|compile)\r?\n([\s\S]*?)\r?\n```/gu;
  const examples = [...readme.matchAll(expression)];
  if (examples.length < 5) throw new Error('Packed README must contain at least five examples.');

  const compileFiles = [];
  let runCount = 0;
  for (const [index, match] of examples.entries()) {
    const language = match[1];
    const mode = match[2];
    const source = match[3];
    if (source === undefined || language === undefined || mode === undefined) continue;
    if (mode === 'run') {
      runCount += 1;
      const file = path.join(consumer, `example-${index}.mjs`);
      await writeFile(file, source, 'utf8');
      const startedAt = Date.now();
      runNode([file], { cwd: consumer });
      const durationMs = Date.now() - startedAt;
      if (durationMs >= 5 * 60_000) {
        throw new Error(`Quick-start example exceeded five minutes (${durationMs}ms).`);
      }
    } else {
      const fileName = `example-${index}.mts`;
      compileFiles.push(fileName);
      await writeFile(path.join(consumer, fileName), source, 'utf8');
    }
  }
  if (runCount !== 1) throw new Error(`Expected one executable quick start; found ${runCount}.`);
  await writeFile(
    path.join(consumer, 'tsconfig.docs.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: false
        },
        files: compileFiles
      },
      null,
      2
    )}\n`,
    'utf8'
  );
  runNode(
    [
      path.join(consumer, 'node_modules', 'typescript', 'bin', 'tsc'),
      '--project',
      'tsconfig.docs.json'
    ],
    { cwd: consumer }
  );
  console.log(`Packed README proof passed: ${examples.length} examples, ${runCount} executed.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
