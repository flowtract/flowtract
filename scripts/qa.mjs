import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (npmCli === undefined) {
  throw new Error('npm_execpath is required to run the Gate 2 QA suite.');
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

async function runChecks(scripts) {
  const results = await Promise.all(scripts.map(runScript));
  const failures = results.filter(result => result.error !== undefined);
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(failure => failure.error),
      `Flowtract Gate 2 QA checks failed: ${failures.map(failure => failure.script).join(', ')}`
    );
  }
}

await runChecks(['format:check', 'lint', 'type-check', 'repository:check', 'secret:check']);
await runChecks(['coverage']);

const proofDurationMs = Date.now() - startedAt;
if (proofDurationMs >= 60_000) {
  throw new Error(`Flowtract Gate 2 proof exceeded 60 seconds (${proofDurationMs}ms).`);
}

const buildResult = await runScript('build');
if (buildResult.error !== undefined) {
  throw buildResult.error;
}

const packageResult = await runScript('package:check');
if (packageResult.error !== undefined) {
  throw packageResult.error;
}

const durationMs = Date.now() - startedAt;
console.log(
  `Flowtract Gate 2 QA passed: runtime proof ${proofDurationMs}ms; full QA ${durationMs}ms.`
);
