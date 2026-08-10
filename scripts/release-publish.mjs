import { access, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  fetchPackageMetadata,
  parseArguments,
  readJson,
  readReleaseContract,
  repositoryRoot,
  registryDecision,
  requireFullSha,
  run,
  runNpm,
  selectChannel,
  sha512,
  validatePackageOwnership,
  validateEvidence
} from './release-lib.mjs';

const arguments_ = parseArguments(process.argv.slice(2));
const contract = await readReleaseContract();
const selected = selectChannel(contract, arguments_.get('channel'));
const expectedSha = requireFullSha(arguments_.get('expected-sha'));
const evidencePath = path.resolve(arguments_.get('evidence') ?? '');
if (arguments_.get('evidence') === undefined) throw new Error('--evidence is required.');
const evidence = await readJson(evidencePath);
if (
  typeof evidence.filename !== 'string' ||
  path.basename(evidence.filename) !== evidence.filename ||
  !/^flowtract-\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?\.tgz$/u.test(evidence.filename)
) {
  throw new Error('Release evidence contains an invalid tarball filename.');
}
const tarball = path.join(path.dirname(evidencePath), evidence.filename);
await access(tarball);
const integrity = await sha512(tarball);
validateEvidence(evidence, {
  sourceSha: expectedSha,
  channel: selected.channel,
  version: selected.version,
  integrity
});
if (
  evidence.tag !== selected.tag ||
  evidence.npm !== contract.npm ||
  !new RegExp(`^v${contract.node}\\.`).test(evidence.node ?? '')
) {
  throw new Error('Release evidence toolchain or distribution tag differs from the contract.');
}
const expectedFiles = await readJson(path.join(repositoryRoot, 'release', 'package-files.json'));
const expectedExports = await readJson(path.join(repositoryRoot, 'release', 'root-exports.json'));
if (JSON.stringify(evidence.files) !== JSON.stringify(expectedFiles)) {
  throw new Error('Release evidence package files differ from the reviewed snapshot.');
}
if (JSON.stringify(evidence.exports) !== JSON.stringify(expectedExports)) {
  throw new Error('Release evidence exports differ from the reviewed snapshot.');
}
const actualSha = run('git', ['rev-parse', 'HEAD'], { capture: true }).trim();
if (actualSha !== expectedSha) throw new Error('Publish checkout differs from the accepted SHA.');
const recoverExisting = arguments_.get('recover-existing') === 'true';
const before = await fetchPackageMetadata(contract.registry, contract.package);
validatePackageOwnership(before, contract.package, contract.owners);
const decision = registryDecision({
  metadata: before,
  version: selected.version,
  integrity,
  recoverExisting
});

if (decision === 'publish') {
  runNpm(
    [
      'publish',
      tarball,
      '--ignore-scripts',
      '--access',
      'public',
      '--tag',
      selected.tag,
      '--provenance',
      '--registry',
      contract.registry
    ],
    {
      env: {
        ...process.env,
        FLOWTRACT_RELEASE_AUTHORIZED: '1',
        FLOWTRACT_RELEASE_CHANNEL: selected.channel,
        FLOWTRACT_EXPECTED_SHA: expectedSha,
        GITHUB_ACTIONS: 'true'
      }
    }
  );
}

let published;
for (let attempt = 0; attempt < 10; attempt += 1) {
  const metadata = await fetchPackageMetadata(contract.registry, contract.package);
  validatePackageOwnership(metadata, contract.package, contract.owners);
  published = metadata.versions?.[selected.version];
  if (published?.dist?.integrity === integrity) break;
  await new Promise(resolve => setTimeout(resolve, 2_000));
}
if (published?.dist?.integrity !== integrity) {
  throw new Error('Published registry integrity did not converge to the accepted artifact.');
}
const result = {
  schemaVersion: 1,
  sourceSha: expectedSha,
  channel: selected.channel,
  version: selected.version,
  integrity,
  action: decision,
  verified: true
};
const resultPath = arguments_.get('result');
if (resultPath !== undefined) {
  await writeFile(path.resolve(resultPath), `${JSON.stringify(result, null, 2)}\n`);
}
console.log(`Registry ${decision} path verified flowtract@${selected.version}.`);
