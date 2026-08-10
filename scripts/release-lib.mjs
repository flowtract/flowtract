import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function readReleaseContract() {
  return readJson(path.join(repositoryRoot, 'release', 'flowtract-0.1.json'));
}

export function parseArguments(arguments_) {
  const values = new Map();
  for (let index = 0; index < arguments_.length; index += 2) {
    const key = arguments_[index];
    const value = arguments_[index + 1];
    if (key === undefined || !key.startsWith('--') || value === undefined) {
      throw new Error('Release arguments must be --name value pairs.');
    }
    values.set(key.slice(2), value);
  }
  return values;
}

export function requireFullSha(value, label = 'expected SHA') {
  if (!/^[0-9a-f]{40}$/u.test(value ?? '')) {
    throw new Error(`${label} must be a full lowercase 40-character commit SHA.`);
  }
  return value;
}

export function selectChannel(contract, channel) {
  if (channel !== 'bootstrap' && channel !== 'final') {
    throw new Error('Release channel must be bootstrap or final.');
  }
  return { channel, ...contract[channel] };
}

export function run(command, arguments_, options = {}) {
  return execFileSync(command, arguments_, {
    cwd: options.cwd ?? repositoryRoot,
    encoding: 'utf8',
    stdio: options.capture === true ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    env: options.env ?? process.env
  });
}

export function runNpm(arguments_, options = {}) {
  const npmCli = process.env.npm_execpath;
  if (npmCli === undefined) throw new Error('npm_execpath is required for release proof.');
  return run(process.execPath, [npmCli, ...arguments_], options);
}

export async function sha512(file) {
  const bytes = await readFile(file);
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

export function registryDecision({ metadata, version, integrity, recoverExisting }) {
  const existing = metadata?.versions?.[version];
  if (existing === undefined) return 'publish';
  if (!recoverExisting) {
    throw new Error(`Registry version ${version} already exists; recovery was not authorized.`);
  }
  if (existing.dist?.integrity !== integrity) {
    throw new Error(`Registry version ${version} does not match the accepted artifact integrity.`);
  }
  return 'recover';
}

export function validatePackageOwnership(metadata, packageName, expectedOwners) {
  if (metadata?.name !== packageName) {
    throw new Error('Registry package identity differs from the release contract.');
  }
  const versions = metadata.versions;
  if (versions === null || typeof versions !== 'object' || Array.isArray(versions)) {
    throw new Error('Registry package versions were not an object.');
  }
  if (Object.keys(versions).length === 0) return true;
  const maintainers = Array.isArray(metadata.maintainers) ? metadata.maintainers : [];
  const actualOwners = maintainers
    .map(maintainer =>
      typeof maintainer === 'string'
        ? maintainer
        : maintainer !== null && typeof maintainer === 'object'
          ? maintainer.name
          : undefined
    )
    .filter(owner => typeof owner === 'string')
    .sort();
  const reviewedOwners = [...expectedOwners].sort();
  if (JSON.stringify(actualOwners) !== JSON.stringify(reviewedOwners)) {
    throw new Error('Registry package ownership differs from the reviewed owner snapshot.');
  }
  return true;
}

export function validateSignatureProof(output) {
  if (!/\b[1-9]\d* packages? (?:have|has) verified attestations\b/u.test(output)) {
    throw new Error('Registry signature proof did not verify a provenance attestation.');
  }
  return true;
}

export function validateEvidence(evidence, expected) {
  requireFullSha(evidence?.sourceSha, 'evidence source SHA');
  if (
    evidence.schemaVersion !== 1 ||
    evidence.sourceSha !== expected.sourceSha ||
    evidence.channel !== expected.channel ||
    evidence.version !== expected.version ||
    evidence.integrity !== expected.integrity ||
    !Array.isArray(evidence.files) ||
    !Array.isArray(evidence.exports)
  ) {
    throw new Error('Release evidence does not match the accepted rehearsal contract.');
  }
  return true;
}

export async function fetchPackageMetadata(registry, packageName) {
  const response = await fetch(new URL(encodeURIComponent(packageName), registry), {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(15_000)
  });
  if (response.status === 404) return { name: packageName, versions: {} };
  if (!response.ok)
    throw new Error(`Registry metadata request failed with status ${response.status}.`);
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error('Registry metadata exceeded the 2 MB safety bound.');
  const metadata = JSON.parse(text);
  if (metadata === null || typeof metadata !== 'object') {
    throw new Error('Registry metadata was not an object.');
  }
  return metadata;
}
