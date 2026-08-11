import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNode } from './release-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const file of [
  'authenticated-workflow.mjs',
  'lifecycle-workflow.mjs',
  'contract-workflow.mjs'
]) {
  const output = runNode([path.join(root, 'examples', 'market-gap', file)], {
    capture: true,
    cwd: root
  });
  if (!output.trim().endsWith(': passed')) throw new Error(`${file} did not report success.`);
}
console.log('Gate 4A market proof passed: 3 public workflows.');
