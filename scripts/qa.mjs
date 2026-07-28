import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (npmCli === undefined) {
  throw new Error('npm_execpath is required to run the Gate 1 QA suite.');
}

const startedAt = Date.now();

function runScript(script) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [npmCli, 'run', script], {
      stdio: 'inherit',
      windowsHide: true
    });
    child.once('error', error => resolve({ script, error }));
    child.once('close', (code, signal) => {
      resolve({
        script,
        ...(code === 0
          ? {}
          : {
              error: new Error(
                `${script} failed with ${signal === null ? `exit code ${String(code)}` : `signal ${signal}`}.`
              )
            })
      });
    });
  });
}

const independentChecks = [
  'format:check',
  'lint',
  'type-check',
  'coverage',
  'build',
  'repository:check',
  'secret:check'
];
const results = await Promise.all(independentChecks.map(runScript));
const failures = results.filter(result => result.error !== undefined);
if (failures.length > 0) {
  throw new AggregateError(
    failures.map(failure => failure.error),
    `Flowtract QA checks failed: ${failures.map(failure => failure.script).join(', ')}`
  );
}

const packageResult = await runScript('package:check');
if (packageResult.error !== undefined) {
  throw packageResult.error;
}

const durationMs = Date.now() - startedAt;
if (durationMs >= 60_000) {
  throw new Error(`Flowtract QA exceeded 60 seconds (${durationMs}ms).`);
}

console.log(`Flowtract QA passed in ${durationMs}ms.`);
