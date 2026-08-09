import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  parseArguments,
  readJson,
  readReleaseContract,
  repositoryRoot,
  requireFullSha,
  run,
  runNpm,
  selectChannel,
  sha512
} from './release-lib.mjs';

const arguments_ = parseArguments(process.argv.slice(2));
const contract = await readReleaseContract();
const selected = selectChannel(contract, arguments_.get('channel'));
const sourceSha = requireFullSha(arguments_.get('expected-sha'));
const output = path.resolve(arguments_.get('output') ?? '');
if (arguments_.get('output') === undefined) throw new Error('--output is required.');
const actualSha = run('git', ['rev-parse', 'HEAD'], { capture: true }).trim();
if (actualSha !== sourceSha) throw new Error('Rehearsal SHA does not match checked-out HEAD.');

const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'flowtract-release-rehearsal-'));
try {
  runNpm(['run', 'build', '--workspace', contract.package]);
  const source = path.join(repositoryRoot, contract.packageRoot);
  const candidate = path.join(temporaryRoot, 'package');
  await cp(source, candidate, {
    recursive: true,
    filter: value => !value.split(path.sep).includes('node_modules')
  });
  const manifestPath = path.join(candidate, 'package.json');
  const manifest = await readJson(manifestPath);
  manifest.version = selected.version;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await mkdir(output, { recursive: true });
  const packed = JSON.parse(
    runNpm(['pack', '--ignore-scripts', '--json', '--pack-destination', output], {
      cwd: candidate,
      capture: true
    })
  );
  const [archive] = packed;
  if (archive === undefined) throw new Error('npm pack did not report an archive.');
  const expectedFiles = await readJson(path.join(repositoryRoot, 'release', 'package-files.json'));
  const files = archive.files.map(file => file.path).sort();
  if (JSON.stringify(files) !== JSON.stringify(expectedFiles)) {
    throw new Error('Rehearsed package files differ from the reviewed snapshot.');
  }
  const exports = await readJson(path.join(repositoryRoot, 'release', 'root-exports.json'));
  const tarball = path.join(output, archive.filename);
  const integrity = await sha512(tarball);
  if (integrity !== archive.integrity) throw new Error('Tarball SHA-512 differs from npm pack.');
  const sbomText = runNpm(['sbom', '--sbom-format', 'cyclonedx'], { capture: true });
  const sbom = JSON.parse(sbomText);
  if (sbom.bomFormat !== 'CycloneDX') throw new Error('Rehearsal SBOM was not CycloneDX.');
  await writeFile(path.join(output, 'flowtract.cdx.json'), `${JSON.stringify(sbom, null, 2)}\n`);
  const evidence = {
    schemaVersion: 1,
    sourceSha,
    channel: selected.channel,
    version: selected.version,
    tag: selected.tag,
    integrity,
    filename: archive.filename,
    files,
    exports,
    node: process.version,
    npm: contract.npm
  };
  await writeFile(
    path.join(output, 'release-evidence.json'),
    `${JSON.stringify(evidence, null, 2)}\n`
  );
  console.log(
    `Gate 4A ${selected.channel} rehearsal passed for ${selected.version} with ${files.length} files.`
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
