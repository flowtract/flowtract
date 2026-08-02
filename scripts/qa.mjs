import { spawn } from 'node:child_process';

const npmCli = process.env.npm_execpath;
if (npmCli === undefined) throw new Error('npm_execpath is required to run the Gate 3 QA suite.');

const orchestrationStartedAt = Date.now();

function runScript(script, options = {}) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [npmCli, 'run', script], {
      stdio: 'inherit',
      windowsHide: true,
      env: { ...process.env, ...(options.env ?? {}) }
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

async function runChecks(checks) {
  const results = await Promise.all(
    checks.map(check =>
      typeof check === 'string' ? runScript(check) : runScript(check.script, check)
    )
  );
  const failures = results.filter(result => result.error !== undefined);
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map(failure => failure.error),
      `Flowtract Gate 3 QA checks failed: ${failures.map(failure => failure.script).join(', ')}`
    );
  }
}

const runtimeStartedAt = Date.now();
await runChecks([
  'format:check',
  'lint',
  'type-check',
  'repository:check',
  'secret:check',
  'api-docs:check'
]);
await runChecks(['coverage']);
const runtimeDurationMs = Date.now() - runtimeStartedAt;
if (runtimeDurationMs >= 60_000) {
  throw new Error(`Flowtract Gate 3 runtime proof exceeded 60 seconds (${runtimeDurationMs}ms).`);
}

const buildResult = await runScript('build');
if (buildResult.error !== undefined) throw buildResult.error;

const packageStartedAt = Date.now();
const packageResult = await runScript('package:check');
if (packageResult.error !== undefined) throw packageResult.error;
const packageDurationMs = Date.now() - packageStartedAt;
if (packageDurationMs >= 60_000) {
  throw new Error(`Flowtract Gate 3 package proof exceeded 60 seconds (${packageDurationMs}ms).`);
}

await runChecks([
  'peer-matrix',
  { script: 'docs:check', env: { FLOWTRACT_SKIP_BUILD: '1' } },
  'sbom:check',
  'package:publish-dry-run:built'
]);

const orchestrationDurationMs = Date.now() - orchestrationStartedAt;
console.log(
  `Flowtract Gate 3 QA passed: runtime proof ${runtimeDurationMs}ms; package proof ${packageDurationMs}ms; full orchestration ${orchestrationDurationMs}ms.`
);
