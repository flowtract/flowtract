import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const npmCli = process.env.npm_execpath;
if (npmCli === undefined) {
  throw new Error('npm_execpath is required for the clean-clone proof.');
}

const root = resolve(import.meta.dirname, '..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'flowtract-clean-clone-'));
const clone = join(temporaryRoot, 'repository');

function run(executable, args, cwd) {
  execFileSync(executable, args, {
    cwd,
    stdio: 'inherit',
    windowsHide: true
  });
}

try {
  run('git', ['clone', '--local', '--no-hardlinks', root, clone], root);
  run(process.execPath, [npmCli, 'ci', '--ignore-scripts'], clone);
  run(process.execPath, [npmCli, 'run', 'qa'], clone);
  run(process.execPath, [npmCli, 'run', 'type-matrix'], clone);
  run(process.execPath, [npmCli, 'audit', '--omit=dev', '--audit-level=high'], clone);

  const status = execFileSync('git', ['status', '--porcelain'], {
    cwd: clone,
    encoding: 'utf8',
    windowsHide: true
  }).trim();
  if (status !== '') {
    throw new Error(`Clean-clone proof changed tracked files:\n${status}`);
  }
  console.log('Clean-clone proof passed.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
