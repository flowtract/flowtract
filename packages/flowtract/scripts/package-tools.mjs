import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function runNode(arguments_, options = {}) {
  return execFileSync(process.execPath, arguments_, {
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    ...options
  });
}

export function runNpm(arguments_, options = {}) {
  const npmCli = process.env.npm_execpath;
  if (npmCli === undefined) {
    throw new Error('npm_execpath is required to run package contract checks.');
  }
  return runNode([npmCli, ...arguments_], options);
}

export async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function createConsumer(directory, files) {
  await mkdir(directory, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, contents]) =>
      name.endsWith('.json')
        ? writeJson(path.join(directory, name), contents)
        : writeFile(path.join(directory, name), contents, 'utf8')
    )
  );
}

export function installConsumer(directory, tarball, typescriptVersion) {
  const dependencies = [
    'install',
    '--ignore-scripts',
    '--no-audit',
    '--no-fund',
    '--no-package-lock',
    tarball,
    'zod@4.4.3',
    'playwright@1.62.0'
  ];
  if (typescriptVersion !== undefined) {
    dependencies.push(`typescript@${typescriptVersion}`);
  }
  runNpm(dependencies, { cwd: directory });
}

export function runConsumerTypeScript(directory, project = 'tsconfig.json') {
  const compiler = path.join(directory, 'node_modules', 'typescript', 'bin', 'tsc');
  runNode([compiler, '--project', project], { cwd: directory });
}
