import { runNpm } from './release-lib.mjs';

const startedAt = Date.now();
for (const script of [
  'gate3:qa',
  'release:contract:check',
  'release:self-test',
  'docs:site:check',
  'market-proof:check'
]) {
  runNpm(['run', script]);
}
console.log(`Flowtract Gate 4A QA passed in ${Date.now() - startedAt}ms.`);
