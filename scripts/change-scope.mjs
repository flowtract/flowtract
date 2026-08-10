import { appendFile } from 'node:fs/promises';
import { run } from './release-lib.mjs';

const event = process.env.GITHUB_EVENT_NAME;
let full = event === 'workflow_dispatch';
let files = [];
if (!full) {
  const base = process.env.FLOWTRACT_BASE_SHA;
  const head = process.env.FLOWTRACT_HEAD_SHA;
  if (
    !/^[0-9a-f]{40}$/u.test(base ?? '') ||
    !/^[0-9a-f]{40}$/u.test(head ?? '') ||
    /^0{40}$/u.test(base ?? '')
  ) {
    full = true;
  } else {
    files = run('git', ['diff', '--name-only', base, head], { capture: true })
      .split(/\r?\n/u)
      .filter(Boolean);
    full = files.length === 0 || files.some(file => !file.toLowerCase().endsWith('.md'));
  }
}
const output = process.env.GITHUB_OUTPUT;
if (output !== undefined) await appendFile(output, `full=${full ? 'true' : 'false'}\n`);
console.log(`Change scope: ${full ? 'full' : 'markdown-only'} (${files.length} changed files).`);
