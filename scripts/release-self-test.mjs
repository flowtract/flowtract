import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import path from 'node:path';
import {
  fetchPackageMetadata,
  repositoryRoot,
  registryDecision,
  requireFullSha,
  run,
  runNpm,
  selectChannel,
  validatePackageOwnership,
  validateSignatureProof,
  validateEvidence
} from './release-lib.mjs';

const sha = 'a'.repeat(40);
assert.equal(requireFullSha(sha), sha);
assert.throws(() => requireFullSha('abc'), /full lowercase/u);
const contract = {
  bootstrap: { version: '0.1.0-rc.0', tag: 'next' },
  final: { version: '0.1.0', tag: 'latest' }
};
assert.equal(selectChannel(contract, 'bootstrap').version, '0.1.0-rc.0');
assert.equal(selectChannel(contract, 'final').tag, 'latest');
assert.throws(() => selectChannel(contract, 'preview'), /bootstrap or final/u);
assert.equal(
  registryDecision({ metadata: { versions: {} }, version: '0.1.0', integrity: 'sha512-ok' }),
  'publish'
);
assert.throws(
  () =>
    registryDecision({
      metadata: { versions: { '0.1.0': { dist: { integrity: 'sha512-ok' } } } },
      version: '0.1.0',
      integrity: 'sha512-ok',
      recoverExisting: false
    }),
  /recovery was not authorized/u
);
assert.equal(
  registryDecision({
    metadata: { versions: { '0.1.0': { dist: { integrity: 'sha512-ok' } } } },
    version: '0.1.0',
    integrity: 'sha512-ok',
    recoverExisting: true
  }),
  'recover'
);
assert.throws(
  () =>
    registryDecision({
      metadata: { versions: { '0.1.0': { dist: { integrity: 'sha512-other' } } } },
      version: '0.1.0',
      integrity: 'sha512-ok',
      recoverExisting: true
    }),
  /does not match/u
);
const evidence = {
  schemaVersion: 1,
  sourceSha: sha,
  channel: 'final',
  version: '0.1.0',
  integrity: 'sha512-ok',
  files: ['package.json'],
  exports: ['createFlowtract']
};
assert.equal(validateEvidence(evidence, evidence), true);
assert.throws(
  () => validateEvidence({ ...evidence, integrity: 'sha512-bad' }, evidence),
  /does not match/u
);

async function withRegistryResponse({ status = 200, body = '' }, action) {
  const server = createServer((_request, response) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(body);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Mock registry did not expose a TCP address.');
    }
    return await action(`http://127.0.0.1:${address.port}/`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => (error === undefined ? resolve() : reject(error)));
    });
  }
}

await withRegistryResponse({ status: 404 }, async registry => {
  assert.deepEqual(await fetchPackageMetadata(registry, 'flowtract'), {
    name: 'flowtract',
    versions: {}
  });
});
await withRegistryResponse({ status: 503 }, async registry => {
  await assert.rejects(fetchPackageMetadata(registry, 'flowtract'), /status 503/u);
});
await withRegistryResponse({ body: '{invalid' }, async registry => {
  await assert.rejects(fetchPackageMetadata(registry, 'flowtract'), SyntaxError);
});
await withRegistryResponse({ body: 'x'.repeat(2_000_001) }, async registry => {
  await assert.rejects(fetchPackageMetadata(registry, 'flowtract'), /2 MB safety bound/u);
});
assert.equal(
  validatePackageOwnership(
    {
      name: 'flowtract',
      versions: { '0.1.0-rc.0': {} },
      maintainers: [{ name: 'iamprasanna-dev' }]
    },
    'flowtract',
    ['iamprasanna-dev']
  ),
  true
);
assert.throws(
  () =>
    validatePackageOwnership(
      {
        name: 'flowtract',
        versions: { '0.1.0-rc.0': {} },
        maintainers: [{ name: 'unexpected-owner' }]
      },
      'flowtract',
      ['iamprasanna-dev']
    ),
  /ownership differs/u
);
assert.equal(validateSignatureProof('1 package has verified attestations'), true);
assert.throws(() => validateSignatureProof('0 packages have verified attestations'), /provenance/u);

const guard = path.join(repositoryRoot, 'packages', 'flowtract', 'scripts', 'release-guard.mjs');
assert.throws(() => run(process.execPath, [guard], { capture: true, env: {} }));
assert.doesNotThrow(() =>
  run(process.execPath, [guard], {
    capture: true,
    env: {
      FLOWTRACT_RELEASE_AUTHORIZED: '1',
      FLOWTRACT_RELEASE_CHANNEL: 'final',
      FLOWTRACT_EXPECTED_SHA: sha,
      GITHUB_ACTIONS: 'true',
      GITHUB_SHA: sha
    }
  })
);

const inheritedNpmCli = process.env.npm_execpath;
delete process.env.npm_execpath;
try {
  assert.match(runNpm(['--version'], { capture: true }).trim(), /^\d+\.\d+\.\d+$/u);
} finally {
  if (inheritedNpmCli !== undefined) process.env.npm_execpath = inheritedNpmCli;
}

console.log('Gate 4A release self-test passed with 21 fail-closed decisions.');
